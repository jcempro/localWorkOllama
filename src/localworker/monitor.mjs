import { promises as fs } from "node:fs";
import http from "node:http";
import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";
import { randomBytes, createHash } from "node:crypto";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { jobDir, getState, listJobs, readJson, atomicJson, alive } from "./job-store.mjs";
import { PAGE_M7Q } from "./monitor-page.mjs";

const ROOT_M7Q = path.dirname(fileURLToPath(import.meta.url));
const DESCRIPTOR_M7Q = path.join(ROOT_M7Q, "monitor.json");
const START_LOCK_M7Q = path.join(ROOT_M7Q, "monitor-start.lock");
const HOST_M7Q = "127.0.0.1";
const PRIMARY_PORT_M7Q = 49767;
const FALLBACK_PORT_M7Q = 49768;
const MAX_EVENTS_M7Q = 2000;
const MAX_LIST_LIMIT_M7Q = 100;
const STALE_HEARTBEAT_MS_M7Q = 90_000;
const WAIT_MODEL_MS_M7Q = 180_000;
const WATCHDOG_INTERVAL_MS_M7Q = 60_000;
const execFileAsync = promisify(execFile);

async function sourceHashM7Q() {
  const sources = await Promise.all(["monitor.mjs", "monitor-page.mjs"].map(name => fs.readFile(path.join(ROOT_M7Q, name))));
  return createHash("sha256").update(sources[0]).update(sources[1]).digest("hex");
}

async function health(descriptor) {
  if (!descriptor?.port || !descriptor?.token) return false;
  try {
    const response = await fetch(`http://${HOST_M7Q}:${descriptor.port}/health?token=${descriptor.token}`, { signal: AbortSignal.timeout(1500) });
    return response.ok;
  } catch { return false; }
}

export async function listenPreferredM7Q(server, host = HOST_M7Q, ports = [PRIMARY_PORT_M7Q, FALLBACK_PORT_M7Q]) {
  for (const port of ports) {
    try {
      await new Promise((resolve, reject) => {
        const onError = error => { server.off("listening", onListening); reject(error); };
        const onListening = () => { server.off("error", onError); resolve(); };
        server.once("error", onError);
        server.once("listening", onListening);
        server.listen(port, host);
      });
      return port;
    } catch (error) {
      if (error?.code !== "EADDRINUSE") throw error;
    }
  }
  throw new Error(`Monitor indisponível: portas fixas ${ports.join(" e ")} ocupadas em ${host}.`);
}

export async function ensureMonitor() {
  const sourceHash = await sourceHashM7Q();
  let lock;
  for (let attempt = 0; attempt < 50; attempt++) {
    const current = await readJson(DESCRIPTOR_M7Q).catch(() => null);
    if (current?.source_sha256 === sourceHash && alive(current.pid) && await health(current)) return current;
    try { lock = await fs.open(START_LOCK_M7Q, "wx"); break; }
    catch (error) {
      if (error?.code !== "EEXIST") throw error;
      const held = await readJson(START_LOCK_M7Q).catch(() => null);
      const stat = await fs.stat(START_LOCK_M7Q).catch(() => null);
      if (stat && Date.now() - stat.mtimeMs > 30_000 && !alive(held?.pid)) await fs.rm(START_LOCK_M7Q, { force: true }).catch(() => {});
      await new Promise(resolve => setTimeout(resolve, 150));
    }
  }
  if (!lock) throw new Error("Inicialização concorrente do monitor não concluiu em 8 segundos.");
  try {
    await lock.writeFile(JSON.stringify({ pid: process.pid, started_at: new Date().toISOString() }));
    const old = await readJson(DESCRIPTOR_M7Q).catch(() => null);
    if (old?.source_sha256 === sourceHash && await health(old)) return old;
    if (await health(old)) {
      await fetch(`http://${HOST_M7Q}:${old.port}/shutdown?token=${old.token}`, { method: "POST", signal: AbortSignal.timeout(1500) }).catch(() => {});
    }
    const child = spawn(process.execPath, [fileURLToPath(import.meta.url), "serve"], {
      cwd: ROOT_M7Q, detached: true, stdio: "ignore", windowsHide: true,
    });
    child.unref();
    for (let attempt = 0; attempt < 40; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 150));
      const current = await readJson(DESCRIPTOR_M7Q).catch(() => null);
      if (current?.pid === child.pid && current.source_sha256 === sourceHash && await health(current)) return current;
    }
    throw new Error("Interface local de acompanhamento não iniciou em 6 segundos.");
  } finally {
    await lock.close();
    await fs.rm(START_LOCK_M7Q, { force: true });
  }
}

export function monitorUrl(descriptor, id) {
  jobDir(id);
  return `http://${HOST_M7Q}:${descriptor.port}/job/${id}?token=${descriptor.token}`;
}

export function monitorIndexUrl(descriptor) {
  return `http://${HOST_M7Q}:${descriptor.port}/?token=${descriptor.token}`;
}

async function eventsFor(id) {
  const log = await fs.readFile(path.join(jobDir(id), "worker.log"), "utf8").catch(() => "");
  return log.trimEnd().split(/\r?\n/).slice(-MAX_EVENTS_M7Q).flatMap(line => {
    const split = line.indexOf(" {");
    if (split < 0) return [];
    try { return [{ at: line.slice(0, split), ...JSON.parse(line.slice(split + 1)) }]; }
    catch { return []; }
  });
}

let resourceCache = { at: 0, value: { ollama_cpu_seconds: null, ollama_memory_bytes: null, gpu_percent: null } };
async function resources() {
  if (Date.now() - resourceCache.at < 10_000) return resourceCache.value;
  const value = { ollama_cpu_seconds: null, ollama_memory_bytes: null, gpu_percent: null,
    ram_available_bytes: os.freemem(), ram_total_bytes: os.totalmem(), gpu_used_mib: null, gpu_free_mib: null };
  if (process.platform === "win32") {
    try {
      const script = '$p=Get-Process -Name "ollama*" -ErrorAction SilentlyContinue; [pscustomobject]@{cpu=(($p | Measure-Object CPU -Sum).Sum); memory=(($p | Measure-Object WorkingSet64 -Sum).Sum)} | ConvertTo-Json -Compress';
      const { stdout } = await execFileAsync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], { windowsHide: true, timeout: 3000 });
      const parsed = JSON.parse(stdout);
      value.ollama_cpu_seconds = Number(parsed.cpu ?? 0);
      value.ollama_memory_bytes = Number(parsed.memory ?? 0);
    } catch {}
    try {
      const { stdout } = await execFileAsync("nvidia-smi", ["--query-gpu=utilization.gpu,memory.used,memory.free", "--format=csv,noheader,nounits"], { windowsHide: true, timeout: 2000 });
      const samples = stdout.trim().split(/\r?\n/).map(line => line.split(",").map(part => Number(part.trim())))
        .filter(parts => parts.length === 3 && parts.every(Number.isFinite));
      if (samples.length) {
        value.gpu_percent = Math.max(...samples.map(parts => parts[0]));
        value.gpu_used_mib = samples.reduce((sum, parts) => sum + parts[1], 0);
        value.gpu_free_mib = Math.min(...samples.map(parts => parts[2]));
      }
    } catch {}
  }
  resourceCache = { at: Date.now(), value };
  return value;
}

const lastSamples = new Map();
export function classifyActivity(state, events, resource, files) {
  if (state.status === "CORRUPT") return { kind: "CORRUPT", reason: state.error ?? "Estado do job ilegível." };
  if (["COMPLETED", "FAILED", "CANCELLED"].includes(state.status)) return { kind: "TERMINAL", reason: `Estado ${state.status}.` };
  const running = state.status === "RUNNING";
  const runnerAlive = alive(state.pid);
  if (running && !runnerAlive) return files.result || files.error
    ? { kind: "TERMINAL_NOT_PROPAGATED", reason: "Runner ausente; artefato terminal existe e o estado não foi atualizado." }
    : { kind: "ORPHANED", reason: "Runner ausente e sem artefato terminal." };
  const heartbeatAge = Date.now() - Date.parse(state.heartbeat_at ?? state.created_at);
  if (running && heartbeatAge > STALE_HEARTBEAT_MS_M7Q) return { kind: "STALLED", reason: `Heartbeat há ${Math.round(heartbeatAge / 1000)} s.` };
  const recent = events.at(-1);
  if (recent?.phase === "resource_wait") return { kind: "WAITING_RESOURCES", reason: `${recent.reason ?? "Recursos insuficientes"}; RAM ${Math.round((recent.ram_available_bytes ?? 0) / 1048576)}/${Math.round((recent.ram_reserve_bytes ?? 0) / 1048576)} MiB, VRAM ${recent.gpu_free_mib ?? "indisponível"}/${recent.gpu_reserve_mib ?? "indisponível"} MiB; Worker aguarda sem inferir.` };
  const request = [...events].reverse().find(event => event.phase === "ollama_request" || event.phase === "ollama_response" || event.phase === "ollama_error");
  const eventAge = recent ? Date.now() - Date.parse(recent.at) : Infinity;
  const previous = lastSamples.get(state.job_id);
  const cpuActive = previous && resource.ollama_cpu_seconds != null && previous.cpu != null && resource.ollama_cpu_seconds - previous.cpu > 0.1;
  const activeUntil = cpuActive ? Date.now() + 20_000 : previous?.activeUntil ?? 0;
  lastSamples.set(state.job_id, { at: Date.now(), cpu: resource.ollama_cpu_seconds, activeUntil });
  if (request?.phase === "ollama_request" && (Date.now() < activeUntil || (resource.gpu_percent ?? 0) >= 5)) {
    return { kind: "ACTIVE", reason: "Há requisição deste job pendente e uso observável de CPU/GPU do Ollama; recursos podem ser compartilhados com outras tarefas." };
  }
  if (eventAge < 30_000 && recent.phase !== "ollama_request") return { kind: "ACTIVE", reason: `Evento ${recent.phase} há ${Math.round(eventAge / 1000)} s.` };
  if (request?.phase === "ollama_request") {
    const age = Date.now() - Date.parse(request.at);
    return age < WAIT_MODEL_MS_M7Q
      ? { kind: "WAITING_MODEL", reason: `Resposta do Ollama pendente há ${Math.round(age / 1000)} s; inferência pode estar em curso.` }
      : { kind: "STALLED_SUSPECTED", reason: `Resposta do Ollama pendente há ${Math.round(age / 1000)} s, sem atividade observável. GPU não mensurável pode limitar o diagnóstico.` };
  }
  if (running && eventAge > WAIT_MODEL_MS_M7Q) return { kind: "STALLED", reason: `Sem evento de progresso há ${Math.round(eventAge / 1000)} s.` };
  return { kind: "WAITING", reason: "Runner presente, aguardando próximo evento." };
}

export async function monitorSnapshot(id) {
  const dir = jobDir(id);
  const [state, request, delivery, events, resource, result, error] = await Promise.all([
    getState(id).then(value => value?.job_id === id ? value : Promise.reject(new Error("state.json pertence a outro job ou é inválido")))
      .catch(async failure => ({ job_id: id, status: "CORRUPT", created_at: (await fs.stat(dir)).birthtime.toISOString(),
      error: `state.json ilegível: ${String(failure?.message ?? failure).slice(0, 200)}` })),
    readJson(path.join(dir, "request.json")).catch(() => ({})),
    readJson(path.join(dir, "delivery.json")).catch(() => ({})), eventsFor(id), resources(),
    fs.stat(path.join(dir, "result.md")).then(() => true).catch(() => false),
    fs.stat(path.join(dir, "error.txt")).then(() => true).catch(() => false),
  ]);
  const config = await readJson(path.join(ROOT_M7Q, "config.json")).catch(() => ({}));
  const progress = { step: state.step ?? events.filter(event => event.phase === "step").at(-1)?.step ?? 0,
    max_steps: Number(process.env.LOCAL_WORKER_MAX_STEPS ?? config.max_steps ?? 40),
    completed_tools: state.completed_tools ?? events.filter(event => event.phase === "tool_result" && event.outcome === "ok").length,
    failed_tools: state.failed_tools ?? events.filter(event => event.phase === "tool_result" && event.outcome !== "ok").length,
    output_tokens_observed: state.output_tokens_observed ?? events.filter(event => event.phase === "ollama_response").reduce((sum, event) => sum + (Number(event.output_tokens) || 0), 0) };
  const responses = events.filter(event => event.phase === "ollama_response");
  const metrics = { prompt_tokens_observed: state.prompt_tokens_observed ?? responses.reduce((sum, event) => sum + (Number(event.prompt_tokens) || 0), 0),
    output_tokens_observed: progress.output_tokens_observed,
    generation_ms_observed: state.generation_ms_observed ?? responses.reduce((sum, event) => sum + (Number(event.eval_duration_ms) || 0), 0),
    context_tokens_configured: Number.isSafeInteger(config.context_tokens) ? config.context_tokens : null,
    api_cost: "Inferência Ollama local; custo de API zero, energia não medida." };
  const durationMs = Math.max(0, Date.parse(state.completed_at ?? new Date().toISOString()) - Date.parse(state.started_at ?? state.created_at));
  return { state, request: { repoPath: request.repoPath ?? null, task: String(request.task ?? "").slice(0, 1000),
    mode: request.mode ?? null, project_id: request.project_id ?? null }, delivery, events, resource, progress, metrics,
    duration_ms: Number.isFinite(durationMs) ? durationMs : null,
    activity: classifyActivity(state, events, resource, { result, error }), observed_at: new Date().toISOString() };
}

const inventoryCacheM7Q = new Map();
const gitRootCacheM7Q = new Map();
async function repoGroupM7Q(request) {
  if (request.git_root) return request.git_root;
  const repo = request.repoPath;
  if (!repo) return "(sem repositório)";
  if (gitRootCacheM7Q.has(repo)) return gitRootCacheM7Q.get(repo);
  let root = repo;
  try {
    const { stdout } = await execFileAsync("git", ["-C", repo, "rev-parse", "--show-toplevel"],
      { windowsHide: true, timeout: 5000 });
    root = await fs.realpath(stdout.trim());
  } catch { /* Repositório removido ou Git ausente: preserve o caminho registrado. */ }
  gitRootCacheM7Q.set(repo, root);
  return root;
}
export async function inventorySnapshot({ repo = "", status = "", sort = "time", direction = "desc", offset = 0, limit = 50 } = {}) {
  if (!["time", "status"].includes(sort) || !["asc", "desc"].includes(direction) ||
      !Number.isSafeInteger(offset) || offset < 0 || !Number.isSafeInteger(limit) || limit < 1 || limit > MAX_LIST_LIMIT_M7Q) {
    throw new Error("Parâmetros de inventário inválidos");
  }
  const rows = [];
  const ids = await listJobs();
  for (const cachedId of inventoryCacheM7Q.keys()) if (!ids.includes(cachedId)) inventoryCacheM7Q.delete(cachedId);
  for (const id of ids) {
    const cached = inventoryCacheM7Q.get(id);
    if (cached) { rows.push(cached); continue; }
    try {
      const dir = jobDir(id);
      const [state, request, delivery] = await Promise.all([getState(id),
        readJson(path.join(dir, "request.json")), readJson(path.join(dir, "delivery.json"))]);
      if (state.job_id !== id) throw new Error("state.json pertence a outro job");
      const row = { job_id: id, status: state.status, activity: state.phase ?? null,
        created_at: state.created_at, completed_at: state.completed_at ?? null,
        duration_ms: Math.max(0, Date.parse(state.completed_at ?? new Date().toISOString()) - Date.parse(state.started_at ?? state.created_at)),
        repo: await repoGroupM7Q(request), project_id: request.project_id ?? null,
        task: String(request.task ?? "").slice(0, 240), mode: request.mode ?? null,
        delivery: delivery.status ?? "UNKNOWN" };
      rows.push(row);
      if (["COMPLETED", "FAILED", "CANCELLED"].includes(state.status) && delivery.status === "QUEUED_TO_CHAT") inventoryCacheM7Q.set(id, row);
    } catch (error) {
      const info = await fs.stat(jobDir(id)).catch(() => null);
      if (!info) continue; // Retenção concluiu durante a leitura.
      rows.push({ job_id: id, status: "CORRUPT", activity: "artifact_error", created_at: info.birthtime.toISOString(),
        completed_at: null, duration_ms: null, repo: "(indisponível)", project_id: null,
        task: `Artefato ilegível: ${String(error?.message ?? error).slice(0, 160)}`, mode: null, delivery: "UNKNOWN" });
    }
  }
  const repositories = [...new Set(rows.map(row => row.repo))].sort((a, b) => a.localeCompare(b));
  const statuses = [...new Set(rows.map(row => row.status))].sort();
  const filtered = rows.filter(row => (!repo || row.repo === repo) && (!status || row.status === status));
  filtered.sort((a, b) => {
    const first = sort === "status" ? a.status.localeCompare(b.status) : (Date.parse(a.created_at) || 0) - (Date.parse(b.created_at) || 0);
    const value = first || (Date.parse(a.created_at) || 0) - (Date.parse(b.created_at) || 0) || a.job_id.localeCompare(b.job_id);
    return direction === "asc" ? value : -value;
  });
  return { jobs: filtered.slice(offset, offset + limit), total: filtered.length, all_total: rows.length,
    repositories, statuses, offset, limit, sort, direction, observed_at: new Date().toISOString() };
}

async function serve() {
  const token = randomBytes(32).toString("hex");
  const server = http.createServer(async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("Content-Security-Policy", "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'");
    try {
      const url = new URL(req.url, `http://${HOST_M7Q}`);
      if (url.searchParams.get("token") !== token) { res.writeHead(403).end("Acesso negado"); return; }
      if (url.pathname === "/health") { res.writeHead(200, { "Content-Type": "text/plain" }).end("ok"); return; }
      if (url.pathname === "/shutdown" && req.method === "POST") { res.writeHead(200).end("ok"); server.close(); return; }
      if (url.pathname === "/api/jobs" && req.method === "GET") {
        const body = JSON.stringify(await inventorySnapshot({ repo: url.searchParams.get("repo") ?? "",
          status: url.searchParams.get("status") ?? "", sort: url.searchParams.get("sort") ?? "time",
          direction: url.searchParams.get("direction") ?? "desc", offset: Number(url.searchParams.get("offset") ?? 0),
          limit: Number(url.searchParams.get("limit") ?? 50) }));
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" }).end(body);
        return;
      }
      if (url.pathname === "/" && req.method === "GET") {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }).end(PAGE_M7Q);
        return;
      }
      const match = /^\/(api\/)?job\/([0-9a-f-]{36})$/i.exec(url.pathname);
      if (!match) { res.writeHead(404).end("Não encontrado"); return; }
      if (match[1]) {
        const body = JSON.stringify(await monitorSnapshot(match[2]));
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" }).end(body);
      } else {
        await fs.stat(jobDir(match[2]));
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }).end(PAGE_M7Q);
      }
    } catch (error) { res.writeHead(500).end(String(error?.message ?? error)); }
  });
  await listenPreferredM7Q(server);
  const source_sha256 = await sourceHashM7Q();
  await atomicJson(DESCRIPTOR_M7Q, { pid: process.pid, port: server.address().port, token, source_sha256, started_at: new Date().toISOString() });
  let watchdogRunning = false;
  const runWatchdog = () => {
    if (watchdogRunning) return;
    watchdogRunning = true;
    const child = spawn(process.execPath, [path.join(ROOT_M7Q, "watchdog.mjs")], {
      cwd: ROOT_M7Q, stdio: "ignore", windowsHide: true,
    });
    child.on("error", () => { watchdogRunning = false; });
    child.on("exit", () => { watchdogRunning = false; });
  };
  setTimeout(runWatchdog, 5_000).unref();
  setInterval(runWatchdog, WATCHDOG_INTERVAL_MS_M7Q).unref();
}

if (process.argv[2] === "serve") await serve();
if (process.argv[2] === "index") console.log(monitorIndexUrl(await ensureMonitor()));
