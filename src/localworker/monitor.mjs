import { promises as fs } from "node:fs";
import http from "node:http";
import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";
import { randomBytes, createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { jobDir, getState, readJson, atomicJson, alive } from "./job-store.mjs";

const ROOT_M7Q = path.dirname(fileURLToPath(import.meta.url));
const DESCRIPTOR_M7Q = path.join(ROOT_M7Q, "monitor.json");
const HOST_M7Q = "127.0.0.1";
const MAX_EVENTS_M7Q = 120;
const STALE_HEARTBEAT_MS_M7Q = 90_000;
const WAIT_MODEL_MS_M7Q = 180_000;
const execFileAsync = promisify(execFile);

async function health(descriptor) {
  if (!descriptor?.port || !descriptor?.token) return false;
  try {
    const response = await fetch(`http://${HOST_M7Q}:${descriptor.port}/health?token=${descriptor.token}`, { signal: AbortSignal.timeout(1500) });
    return response.ok;
  } catch { return false; }
}

export async function ensureMonitor() {
  const sourceHash = createHash("sha256").update(await fs.readFile(fileURLToPath(import.meta.url))).digest("hex");
  const old = await readJson(DESCRIPTOR_M7Q).catch(() => null);
  if (await health(old)) {
    if (old.source_sha256 === sourceHash) return old;
    await fetch(`http://${HOST_M7Q}:${old.port}/shutdown?token=${old.token}`, { method: "POST", signal: AbortSignal.timeout(1500) }).catch(() => {});
  }
  const child = spawn(process.execPath, [fileURLToPath(import.meta.url), "serve"], {
    cwd: ROOT_M7Q, detached: true, stdio: "ignore", windowsHide: true,
  });
  child.unref();
  for (let attempt = 0; attempt < 40; attempt++) {
    await new Promise(resolve => setTimeout(resolve, 150));
    const current = await readJson(DESCRIPTOR_M7Q).catch(() => null);
    if (current?.pid === child.pid && await health(current)) return current;
    if (current?.pid !== child.pid && await health(current)) return current;
  }
  throw new Error("Interface local de acompanhamento não iniciou em 6 segundos.");
}

export function monitorUrl(descriptor, id) {
  jobDir(id);
  return `http://${HOST_M7Q}:${descriptor.port}/job/${id}?token=${descriptor.token}`;
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
  const value = { ollama_cpu_seconds: null, ollama_memory_bytes: null, gpu_percent: null };
  if (process.platform === "win32") {
    try {
      const script = '$p=Get-Process -Name "ollama*" -ErrorAction SilentlyContinue; [pscustomobject]@{cpu=(($p | Measure-Object CPU -Sum).Sum); memory=(($p | Measure-Object WorkingSet64 -Sum).Sum)} | ConvertTo-Json -Compress';
      const { stdout } = await execFileAsync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], { windowsHide: true, timeout: 3000 });
      const parsed = JSON.parse(stdout);
      value.ollama_cpu_seconds = Number(parsed.cpu ?? 0);
      value.ollama_memory_bytes = Number(parsed.memory ?? 0);
    } catch {}
    try {
      const { stdout } = await execFileAsync("nvidia-smi", ["--query-gpu=utilization.gpu", "--format=csv,noheader,nounits"], { windowsHide: true, timeout: 2000 });
      const samples = stdout.trim().split(/\r?\n/).map(Number).filter(Number.isFinite);
      if (samples.length) value.gpu_percent = Math.max(...samples);
    } catch {}
  }
  resourceCache = { at: Date.now(), value };
  return value;
}

const lastSamples = new Map();
export function classifyActivity(state, events, resource, files) {
  if (["COMPLETED", "FAILED", "CANCELLED"].includes(state.status)) return { kind: "TERMINAL", reason: `Estado ${state.status}.` };
  const running = state.status === "RUNNING";
  const runnerAlive = alive(state.pid);
  if (running && !runnerAlive) return files.result || files.error
    ? { kind: "TERMINAL_NOT_PROPAGATED", reason: "Runner ausente; artefato terminal existe e o estado não foi atualizado." }
    : { kind: "ORPHANED", reason: "Runner ausente e sem artefato terminal." };
  const heartbeatAge = Date.now() - Date.parse(state.heartbeat_at ?? state.created_at);
  if (running && heartbeatAge > STALE_HEARTBEAT_MS_M7Q) return { kind: "STALLED", reason: `Heartbeat há ${Math.round(heartbeatAge / 1000)} s.` };
  const recent = events.at(-1);
  const request = [...events].reverse().find(event => event.phase === "ollama_request" || event.phase === "ollama_response" || event.phase === "ollama_error");
  const eventAge = recent ? Date.now() - Date.parse(recent.at) : Infinity;
  const previous = lastSamples.get(state.job_id);
  const cpuActive = previous && resource.ollama_cpu_seconds != null && previous.cpu != null && resource.ollama_cpu_seconds - previous.cpu > 0.1;
  const activeUntil = cpuActive ? Date.now() + 20_000 : previous?.activeUntil ?? 0;
  lastSamples.set(state.job_id, { at: Date.now(), cpu: resource.ollama_cpu_seconds, activeUntil });
  if (Date.now() < activeUntil || (resource.gpu_percent ?? 0) >= 5) return { kind: "ACTIVE", reason: "Uso de CPU do Ollama aumentou ou há atividade de GPU." };
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
  const [state, delivery, events, resource, result, error] = await Promise.all([
    getState(id), readJson(path.join(dir, "delivery.json")).catch(() => ({})), eventsFor(id), resources(),
    fs.stat(path.join(dir, "result.md")).then(() => true).catch(() => false),
    fs.stat(path.join(dir, "error.txt")).then(() => true).catch(() => false),
  ]);
  const config = await readJson(path.join(ROOT_M7Q, "config.json")).catch(() => ({}));
  const progress = { step: state.step ?? events.filter(event => event.phase === "step").at(-1)?.step ?? 0,
    max_steps: Number(process.env.LOCAL_WORKER_MAX_STEPS ?? config.max_steps ?? 40),
    completed_tools: state.completed_tools ?? events.filter(event => event.phase === "tool_result" && event.outcome === "ok").length,
    failed_tools: state.failed_tools ?? events.filter(event => event.phase === "tool_result" && event.outcome !== "ok").length,
    output_tokens_observed: state.output_tokens_observed ?? events.filter(event => event.phase === "ollama_response").reduce((sum, event) => sum + (Number(event.output_tokens) || 0), 0) };
  return { state, delivery, events, resource, progress, activity: classifyActivity(state, events, resource, { result, error }), observed_at: new Date().toISOString() };
}

const PAGE_M7Q = `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>localWorker · acompanhamento</title><style>body{font:16px system-ui;background:#101521;color:#eef2fb;max-width:1080px;margin:auto;padding:24px}h1{font-size:1.5rem}small,.muted{color:#aab6cb}.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px}.card{background:#1d2737;border-radius:10px;padding:14px}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#1d2737;padding:16px;border-radius:10px}table{width:100%;border-collapse:collapse}td,th{padding:8px;border-bottom:1px solid #3d4b61;text-align:left;vertical-align:top}code{overflow-wrap:anywhere}a{color:#9ec8ff}</style><h1>localWorker · acompanhamento</h1><p class="muted">Esta página apenas observa o job. Fechá-la não interrompe a execução. Atualização automática a cada 3 segundos.</p><div class="cards"><div class="card"><small>Job</small><div id="job"></div></div><div class="card"><small>Estado</small><div id="status"></div></div><div class="card"><small>Atividade</small><div id="activity"></div></div><div class="card"><small>Progresso</small><div id="step"></div></div><div class="card"><small>Entrega ao chat</small><div id="delivery"></div></div><div class="card"><small>Recursos</small><div id="resources"></div></div></div><h2>Diagnóstico</h2><pre id="reason"></pre><h2>Eventos recentes</h2><table><thead><tr><th>Horário</th><th>Evento</th><th>Recurso/resultado</th></tr></thead><tbody id="events"></tbody></table><script>const id=location.pathname.split('/').pop(), token=new URLSearchParams(location.search).get('token');const put=(name,value)=>document.getElementById(name).textContent=String(value??'—');async function update(){try{const r=await fetch('/api/job/'+encodeURIComponent(id)+'?token='+encodeURIComponent(token),{cache:'no-store'});if(!r.ok)throw Error('HTTP '+r.status);const x=await r.json(),m=x.resource,p=x.progress;put('job',id);put('status',x.state.status);put('activity',x.activity.kind);put('step',p.step+'/'+p.max_steps+' ciclos · '+p.completed_tools+' ferramentas concluídas · '+p.failed_tools+' falhas · '+p.output_tokens_observed+' tokens de saída observados');put('delivery',x.delivery.status);put('resources','Ollama CPU: '+(m.ollama_cpu_seconds??'indisponível')+' s; memória: '+(m.ollama_memory_bytes==null?'indisponível':Math.round(m.ollama_memory_bytes/1048576)+' MiB')+'; GPU: '+(m.gpu_percent??'indisponível')+'%');put('reason',x.activity.reason+'\nHeartbeat: '+(x.state.heartbeat_at??'—')+'\nObservado: '+x.observed_at);const rows=document.getElementById('events');rows.replaceChildren();for(const v of x.events.slice().reverse()){const tr=document.createElement('tr');for(const t of [v.at,v.phase+' '+(v.tool??''),[v.resource,v.outcome,v.reason,v.error].filter(Boolean).join(' · ')]){const td=document.createElement('td');td.textContent=t;tr.append(td)}rows.append(tr)}}catch(e){put('reason','Monitor indisponível: '+e.message)}}update();setInterval(update,3000)</script></html>`;

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
      const match = /^\/(api\/)?job\/([0-9a-f-]{36})$/i.exec(url.pathname);
      if (!match) { res.writeHead(404).end("Não encontrado"); return; }
      if (match[1]) {
        const body = JSON.stringify(await monitorSnapshot(match[2]));
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" }).end(body);
      } else {
        await getState(match[2]);
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }).end(PAGE_M7Q);
      }
    } catch (error) { res.writeHead(500).end(String(error?.message ?? error)); }
  });
  await new Promise((resolve, reject) => server.listen(0, HOST_M7Q, error => error ? reject(error) : resolve()));
  const source_sha256 = createHash("sha256").update(await fs.readFile(fileURLToPath(import.meta.url))).digest("hex");
  await atomicJson(DESCRIPTOR_M7Q, { pid: process.pid, port: server.address().port, token, source_sha256, started_at: new Date().toISOString() });
}

if (process.argv[2] === "serve") await serve();
