import { promises as fs } from "node:fs";
import { createReadStream } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash, randomUUID } from "node:crypto";
import http from "node:http";
import https from "node:https";
import { jobDir } from "./job-store.mjs";
import { ContextManagerC7M } from "./context-manager.mjs";

const execFileAsync = promisify(execFile);

const installRoot = path.dirname(fileURLToPath(import.meta.url));
let config = {};
try { config = JSON.parse(await fs.readFile(path.join(installRoot, "config.json"), "utf8")); }
catch (error) { if (error?.code !== "ENOENT") throw error; }
const OLLAMA_URL = process.env.OLLAMA_URL ?? config.ollama_url ?? "http://127.0.0.1:11434";

const MODEL = process.env.LOCAL_MODEL ?? config.model ?? "qwen3-coder-next-32k";

const WORKER_RULES =
  process.env.LOCAL_WORKER_RULES ??
  config.worker_rules ??
  path.join(installRoot, "AGENTS.md");

// 0 desativa o teto do job; limites pontuais protegem recursos, comandos e respostas.
const TOTAL_TIMEOUT_MS = Number(process.env.LOCAL_WORKER_TIMEOUT_MS ?? config.timeout_ms ?? 0);
if (!Number.isSafeInteger(TOTAL_TIMEOUT_MS) || TOTAL_TIMEOUT_MS < 0) {
  throw new Error("LOCAL_WORKER_TIMEOUT_MS deve ser 0 (sem teto) ou inteiro positivo em milissegundos.");
}

const MAX_STEPS = Number(process.env.LOCAL_WORKER_MAX_STEPS ?? config.max_steps ?? 40);
if (!Number.isSafeInteger(MAX_STEPS) || MAX_STEPS < 1) {
  throw new Error("LOCAL_WORKER_MAX_STEPS deve ser inteiro positivo; é um teto técnico de ciclos por job, não de duração.");
}
const WRITE_NUDGE_STEP = Math.max(4, Math.floor(MAX_STEPS / 4));
const WRITE_FOCUS_STEP = Math.max(WRITE_NUDGE_STEP + 1, Math.floor(MAX_STEPS / 2));

const MAX_FINAL_CHARS = 16_000;
const MAX_TOOL_CHARS = 24_000;
const MAX_OLLAMA_RESPONSE_BYTES = 32 * 1024 * 1024;
const MAX_FILE_LINES = 600;
const MAX_SEARCH_FILE_BYTES = 2 * 1024 * 1024;
const OLLAMA_ATTEMPTS = Math.max(1, Math.min(10, Number(process.env.LOCAL_OLLAMA_ATTEMPTS ?? config.ollama_attempts ?? 4)));
const CPU_RESERVE_FRACTION_R8N = 0.25;
const RAM_RESERVE_FRACTION_R8N = 0.10;
const RAM_RESERVE_MIN_BYTES_R8N = 4 * 1024 ** 3;
const GPU_RESERVE_MIN_MIB_R8N = 512;
const GPU_RESERVE_FRACTION_R8N = 0.10;
const GPU_RESERVE_REQUEST_BYTES_R8N = process.env.LOCAL_WORKER_GPU_RESERVE_BYTES ?? "0";
const GPU_POLICY_FILE_R8N = path.join(installRoot, "jobs", "gpu-policy.json");
if (!/^\d+$/.test(String(GPU_RESERVE_REQUEST_BYTES_R8N))) throw new Error("LOCAL_WORKER_GPU_RESERVE_BYTES deve ser inteiro não negativo.");
const RESOURCE_WAIT_MS_R8N = 5_000;
const RESOURCE_WAIT_LIMIT_MS_R8N = 120_000;
const RESOURCE_RELEASE_DELAY_MS_R8N = 30_000;
const OLLAMA_KEEP_ALIVE_R8N = process.env.LOCAL_OLLAMA_KEEP_ALIVE ?? config.ollama_keep_alive ?? "2m";
const THREAD_LIMIT_R8N = process.env.LOCAL_WORKER_CPU_THREADS ?? config.cpu_threads ?? "auto";
const CONTEXT_TOKENS_C7M = Number(process.env.LOCAL_WORKER_CONTEXT_TOKENS ?? config.context_tokens ?? 32768);
const MIN_CONTEXT_TOKENS_C7M = Number(process.env.LOCAL_WORKER_MIN_CONTEXT_TOKENS ?? config.min_context_tokens ?? 8192);
const TRANSIENT_OLLAMA_CODES = new Set(["ECONNRESET", "ECONNREFUSED", "EPIPE", "ETIMEDOUT", "EHOSTUNREACH", "ENETUNREACH", "ABORT_ERR"]);

export function resourceBudgetR8N(logicalCpus, totalRam, freeRam, threadLimit = THREAD_LIMIT_R8N) {
  const cores = Math.max(1, Math.floor(logicalCpus));
  const reservedCores = cores === 1 ? 0 : Math.max(1, Math.ceil(cores * CPU_RESERVE_FRACTION_R8N));
  const autoThreads = Math.max(1, cores - reservedCores);
  const configured = threadLimit === "auto" ? autoThreads : Number(threadLimit);
  if (!Number.isInteger(configured) || configured < 1) throw new Error("LOCAL_WORKER_CPU_THREADS deve ser 'auto' ou inteiro positivo.");
  const threads = Math.min(autoThreads, configured);
  const ramReserve = Math.min(totalRam, Math.max(RAM_RESERVE_MIN_BYTES_R8N, Math.ceil(totalRam * RAM_RESERVE_FRACTION_R8N)));
  return { threads, reservedCores, ramReserve, ramAvailable: freeRam, allow: freeRam >= ramReserve };
}

export function gpuBudgetR8N(totalMiB, freeMiB, requestedBytes = GPU_RESERVE_REQUEST_BYTES_R8N) {
  const requestedMiB = requestedBytes ? Math.ceil(Number(requestedBytes) / 1048576) : 0;
  if (!Number.isInteger(requestedMiB) || requestedMiB < 0) throw new Error("LOCAL_WORKER_GPU_RESERVE_BYTES deve ser inteiro não negativo.");
  const reserveMiB = Math.max(GPU_RESERVE_MIN_MIB_R8N, Math.ceil(totalMiB * GPU_RESERVE_FRACTION_R8N), requestedMiB);
  return { totalMiB, reserveMiB, freeMiB, allow: freeMiB >= reserveMiB };
}

async function loadGpuPolicyR8N() {
  try {
    const saved = JSON.parse(await fs.readFile(GPU_POLICY_FILE_R8N, "utf8"));
    const gpu = await gpuMemoryBudgetR8N();
    if (!gpu || saved.schema !== "localworker-gpu-policy/v1" || saved.model !== MODEL ||
        saved.gpu_total_mib !== gpu.totalMiB || !Number.isInteger(saved.layers) ||
        saved.layers < 0 || saved.layers > 1024 || !Number.isFinite(saved.gpu_free_before_mib) ||
        !Number.isFinite(Date.parse(saved.updated_at)) ||
        Date.now() - Date.parse(saved.updated_at) > 7 * 24 * 60 * 60 * 1000) return null;
    let comparableFreeMiB = gpu.freeMiB;
    const toleranceMiB = Math.max(512, Math.ceil(gpu.totalMiB * 0.05));
    if (Math.abs(saved.gpu_free_before_mib - comparableFreeMiB) > toleranceMiB) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5_000);
      try {
        const ps = await ollamaPostJson(null, controller.signal, "api/ps", "GET");
        const loaded = ps.models?.find(item => item.name === MODEL || item.name === `${MODEL}:latest`);
        if (loaded && Number.isFinite(loaded.size_vram)) comparableFreeMiB += Math.round(loaded.size_vram / 1048576);
      } catch {} finally { clearTimeout(timer); }
    }
    return Math.abs(saved.gpu_free_before_mib - comparableFreeMiB) <= toleranceMiB ? saved.layers : null;
  } catch { return null; }
}

async function saveGpuPolicyR8N(gpu, layers, freeBeforeMiB) {
  const directory = path.dirname(GPU_POLICY_FILE_R8N);
  const temporary = `${GPU_POLICY_FILE_R8N}.${randomUUID()}.tmp`;
  await fs.mkdir(directory, { recursive: true });
  try {
    await fs.writeFile(temporary, JSON.stringify({ schema: "localworker-gpu-policy/v1", model: MODEL,
      gpu_total_mib: gpu.totalMiB, gpu_free_before_mib: freeBeforeMiB, layers,
      updated_at: new Date().toISOString() }), { flag: "wx" });
    await fs.rename(temporary, GPU_POLICY_FILE_R8N);
  } finally { await fs.rm(temporary, { force: true }).catch(() => {}); }
}

async function gpuMemoryBudgetR8N() {
  try {
    const { stdout } = await execFileAsync("nvidia-smi", ["--query-gpu=memory.total,memory.free", "--format=csv,noheader,nounits"],
      { windowsHide: true, timeout: 2_000 });
    const samples = stdout.trim().split(/\r?\n/).map(line => line.split(",").map(part => Number(part.trim())))
      .filter(parts => parts.length === 2 && parts.every(Number.isFinite));
    if (!samples.length) return null;
    const budgets = samples.map(([total, free]) => gpuBudgetR8N(total, free));
    return budgets.find(sample => !sample.allow) ?? budgets.sort((a, b) => a.freeMiB - b.freeMiB)[0];
  } catch { return null; }
}

async function workerModelLoadedR8N() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5_000);
  try {
    const ps = await ollamaPostJson(null, controller.signal, "api/ps", "GET");
    return ps.models?.some(item => item.name === MODEL || item.name === `${MODEL}:latest`) ?? false;
  } finally { clearTimeout(timer); }
}

export async function relieveRamPressureR8N(isModelLoaded, unloadModel, onProgress = async () => {}) {
  try {
    if (!await isModelLoaded()) return false;
    await onProgress({ phase: "resource_pressure", reason: "RAM abaixo da reserva; liberando modelo local carregado" });
    await unloadModel();
    await onProgress({ phase: "resource_released", reason: "Modelo local descarregado para recuperar RAM" });
    return true;
  } catch (error) {
    await onProgress({ phase: "resource_release_error", error: safeToolDiagnostic(error) });
    return false;
  }
}

async function awaitResourceBudgetR8N(deadline, onProgress) {
  let waitingSince = Date.now();
  let releaseAttempted = false;
  let releasedModel = false;
  while (true) {
    const budget = resourceBudgetR8N(os.availableParallelism(), os.totalmem(), os.freemem());
    const gpu = await gpuMemoryBudgetR8N();
    if (budget.allow && (gpu === null || gpu.allow)) return { ...budget, gpu };
    await onProgress({ phase: "resource_wait", reason: !budget.allow ? "RAM disponível abaixo da reserva do sistema" : "VRAM livre abaixo da reserva do sistema",
      ram_available_bytes: budget.ramAvailable, ram_reserve_bytes: budget.ramReserve,
      gpu_free_mib: gpu?.freeMiB ?? null, gpu_reserve_mib: gpu?.reserveMiB ?? null,
      cpu_threads: budget.threads, cpu_cores_reserved: budget.reservedCores });
    if (!releaseAttempted && !budget.allow &&
        (budget.ramAvailable < RAM_RESERVE_MIN_BYTES_R8N || Date.now() - waitingSince >= RESOURCE_RELEASE_DELAY_MS_R8N)) {
      releaseAttempted = true;
      if (await relieveRamPressureR8N(workerModelLoadedR8N, unloadWorkerModelR8N, onProgress)) {
        releasedModel = true;
        waitingSince = Date.now();
        continue;
      }
    }
    const remaining = Math.min(deadline - Date.now(), RESOURCE_WAIT_LIMIT_MS_R8N - (Date.now() - waitingSince));
    if (remaining <= 0) throw new Error(`WORKER_INFRA_ERROR: reserva de recursos indisponível após espera segura; RAM ${budget.ramAvailable}/${budget.ramReserve} B, VRAM ${gpu?.freeMiB ?? "indisponível"}/${gpu?.reserveMiB ?? "indisponível"} MiB; tentativa de liberar modelo=${releaseAttempted}; modelo liberado=${releasedModel}.`);
    await new Promise(resolve => setTimeout(resolve, Math.min(RESOURCE_WAIT_MS_R8N, remaining)));
  }
}
class ToolRejected extends Error {}

const SKIP_DIRS = new Set([
  ".git",
  "node_modules",
  "_site",
  ".jekyll-cache",
  ".sass-cache",
  ".bundle",
  "coverage",
  ".cache",
]);

function compact(text, max = MAX_TOOL_CHARS) {
  text = String(text ?? "");

  if (text.length <= max) {
    return text;
  }

  const half = Math.floor((max - 80) / 2);

  return (
    text.slice(0, half) +
    "\n\n[... conteúdo truncado ...]\n\n" +
    text.slice(-half)
  );
}

function inside(root, target) {
  const r = path.resolve(root);
  const t = path.resolve(target);

  const rl = r.toLowerCase();
  const tl = t.toLowerCase();

  return tl === rl || tl.startsWith(rl + path.sep.toLowerCase());
}

function resolveRepoPath(repo, relativePath = ".") {
  if (path.isAbsolute(relativePath)) {
    throw new ToolRejected(`Caminho absoluto não permitido: ${relativePath}`);
  }

  const target = path.resolve(repo, relativePath);

  if (!inside(repo, target)) {
    throw new ToolRejected(`Tentativa de acesso fora do repositório: ${relativePath}`);
  }

  return target;
}

async function safeRepoPath(repo, relativePath = ".") {
  const target = resolveRepoPath(repo, relativePath);
  const root = path.resolve(repo);
  const parts = path.relative(root, target).split(path.sep).filter(Boolean);
  let current = root;
  for (const part of parts) {
    current = path.join(current, part);
    try {
      const stat = await fs.lstat(current);
      if (stat.isSymbolicLink()) throw new ToolRejected(`Junction ou link recusado: ${relativePath}`);
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }
  return target;
}

async function writeTextFile(repo, relativePath, content) {
  const target = await safeRepoPath(repo, relativePath);
  if (typeof content !== "string") throw new Error("Conteúdo textual obrigatório");
  const existing = await fs.readFile(target, "utf8").catch(error => error?.code === "ENOENT" ? null : Promise.reject(error));
  if (existing === content) throw new ToolRejected(`Arquivo já contém o texto solicitado: ${relativePath}`);
  await fs.mkdir(path.dirname(target), { recursive: true });
  const temp = `${target}.${process.pid}.tmp`;
  try {
    await fs.writeFile(temp, content, { flag: "wx" });
    await fs.rename(temp, target);
  } finally {
    await fs.rm(temp, { force: true });
  }
  return `Arquivo gravado: ${relativePath}`;
}

async function editTextFile(repo, relativePath, before, after) {
  const target = await safeRepoPath(repo, relativePath);
  if (!before || typeof before !== "string" || typeof after !== "string") {
    throw new Error("Edição requer before não vazio e after textual");
  }
  if (before === after) throw new ToolRejected(`Edição sem mudança: ${relativePath}`);
  const old = await fs.readFile(target, "utf8");
  const first = old.indexOf(before);
  if (first < 0 || old.indexOf(before, first + before.length) >= 0) {
    throw new Error("Trecho anterior ausente ou não único; nenhuma alteração feita");
  }
  return writeTextFile(repo, relativePath, old.replace(before, after));
}

async function sha256File(file) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest("hex");
}

async function fileInfo(repo, relativePath) {
  const target = await safeRepoPath(repo, relativePath);
  const stat = await fs.lstat(target);
  if (!stat.isFile()) throw new Error(`Não é arquivo regular: ${relativePath}`);
  return JSON.stringify({ path: relativePath, bytes: stat.size, sha256: await sha256File(target) });
}

async function moveFile(repo, fromPath, toPath, expectedSha256) {
  const from = await safeRepoPath(repo, fromPath);
  const to = await safeRepoPath(repo, toPath);
  if (from.toLowerCase() === to.toLowerCase()) throw new Error("Origem e destino coincidem");
  const source = await fs.lstat(from);
  if (!source.isFile()) throw new Error(`Origem não é arquivo regular: ${fromPath}`);
  const originalHash = await sha256File(from);
  if (originalHash !== expectedSha256) throw new ToolRejected("Hash da origem diverge; arquivo preservado");
  await fs.mkdir(path.dirname(to), { recursive: true });
  await fs.copyFile(from, to, fs.constants.COPYFILE_EXCL);
  const copiedHash = await sha256File(to);
  if (copiedHash !== originalHash) throw new Error(`Cópia divergente; origem preservada; destino exige inspeção: ${toPath}`);
  await fs.unlink(from);
  return `Arquivo movido: ${fromPath} → ${toPath}; sha256=${originalHash}`;
}

async function deleteFile(repo, relativePath, expectedSha256) {
  const target = await safeRepoPath(repo, relativePath);
  const stat = await fs.lstat(target);
  if (!stat.isFile()) throw new Error(`Não é arquivo regular: ${relativePath}`);
  const originalHash = await sha256File(target);
  if (originalHash !== expectedSha256) throw new ToolRejected("Hash diverge; arquivo preservado");
  const recoveryDir = path.join(installRoot, "recovery");
  await fs.mkdir(recoveryDir, { recursive: true });
  const backup = path.join(recoveryDir, `${randomUUID()}.bin`);
  await fs.copyFile(target, backup, fs.constants.COPYFILE_EXCL);
  const backupHash = await sha256File(backup);
  if (backupHash !== originalHash) throw new Error(`Backup divergente; original preservado; backup: ${backup}`);
  await fs.writeFile(`${backup}.json`, JSON.stringify({ job_id: process.env.LOCAL_WORKER_JOB_ID ?? null, repo, path: relativePath, sha256: originalHash, backup }, null, 2) + "\n", { flag: "wx" });
  if (await sha256File(target) !== originalHash) throw new ToolRejected(`Arquivo mudou durante o backup; original preservado; backup: ${backup}`);
  await fs.unlink(target);
  return `Arquivo removido com backup recuperável: ${relativePath}; backup=${backup}; sha256=${originalHash}`;
}

async function runAuthorizedCommand(repo, commandId, authorizedCommands) {
  const command = authorizedCommands.find(item => item.id === commandId);
  if (!command) throw new ToolRejected(`Comando não autorizado: ${commandId}`);
  try {
    const { stdout, stderr } = await execFileAsync(command.program, command.args, {
      cwd: repo, windowsHide: true, timeout: command.timeout_ms ?? 300_000,
      maxBuffer: 4 * 1024 * 1024, env: { ...process.env, CI: "1" },
    });
    return compact(`stdout:\n${stdout}\nstderr:\n${stderr}`);
  } catch (error) {
    const stdout = String(error?.stdout ?? "");
    const stderr = String(error?.stderr ?? "");
    const failure = new Error(`Comando autorizado ${commandId} falhou (${error?.code ?? error?.signal ?? "erro"}):\nstdout:\n${compact(stdout, 4000)}\nstderr:\n${compact(stderr, 4000)}`, { cause: error });
    failure.telemetry = `comando ${commandId}: falha ${error?.code ?? error?.signal ?? "erro"}; stdout=${stdout.length} caracteres; stderr=${stderr.length} caracteres`;
    throw failure;
  }
}

async function runCheckedCommand(repo, program, args) {
  const allowed = new Set(["node", "npm", "git"]);
  if (!allowed.has(program) || !Array.isArray(args) || args.some(a => typeof a !== "string")) {
    throw new ToolRejected("run_command requer program exatamente node, npm ou git e args como lista de strings; use run_authorized_command com ID permitido para outro executável ou outra forma de validação");
  }
  if (args.some(a => /[\r\n]/.test(a))) throw new ToolRejected("Argumento multilinha recusado");
  if (program === "node" && !(args[0] === "--check" || args[0] === "--test")) throw new ToolRejected("node limitado a --check/--test");
  if (program === "npm" && !(args[0] === "test" || args[0] === "run")) throw new ToolRejected("npm limitado a test/run");
  if (program === "git" && !(args[0] === "status" || args[0] === "diff")) throw new ToolRejected("git limitado a status/diff");
  const executable = program === "npm" ? process.execPath : program;
  const actualArgs = program === "npm" ? [path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js"), ...args] : args;
  try {
    const { stdout, stderr } = await execFileAsync(executable, actualArgs, {
      cwd: repo, windowsHide: true, timeout: 300_000, maxBuffer: 4 * 1024 * 1024,
      env: { ...process.env, CI: "1", npm_config_offline: "true" },
    });
    return compact(`stdout:\n${stdout}\nstderr:\n${stderr}`);
  } catch (error) {
    const stdout = String(error?.stdout ?? "");
    const stderr = String(error?.stderr ?? "");
    const failure = new Error(`Comando ${program} falhou (${error?.code ?? error?.signal ?? "erro"}):\nstdout:\n${compact(stdout, 4000)}\nstderr:\n${compact(stderr, 4000)}`, { cause: error });
    failure.telemetry = `comando ${program}: falha ${error?.code ?? error?.signal ?? "erro"}; stdout=${stdout.length} caracteres; stderr=${stderr.length} caracteres`;
    throw failure;
  }
}

async function gitChangeFingerprint(repo) {
  try {
    const [status, diff, head] = await Promise.all([
      execFileAsync("git", ["-C", repo, "status", "--porcelain=v1", "-uall"], { windowsHide: true, maxBuffer: 4 * 1024 * 1024 }),
      execFileAsync("git", ["-C", repo, "diff", "--no-ext-diff", "--binary", "HEAD", "--"], { windowsHide: true, maxBuffer: 16 * 1024 * 1024 }),
      execFileAsync("git", ["-C", repo, "rev-parse", "HEAD"], { windowsHide: true, maxBuffer: 1024 }),
    ]);
    const hash = createHash("sha256").update(head.stdout).update("\0").update(status.stdout).update("\0").update(diff.stdout);
    // git diff HEAD não inclui conteúdo de arquivos ainda não rastreados.
    for (const line of status.stdout.split(/\r?\n/)) {
      if (!line.startsWith("?? ")) continue;
      const relative = line.slice(3);
      const file = await safeRepoPath(repo, relative);
      const stat = await fs.lstat(file).catch(error => error?.code === "ENOENT" ? null : Promise.reject(error));
      if (!stat?.isFile()) continue;
      hash.update("\0").update(relative).update("\0").update(await sha256File(file));
    }
    return hash.digest("hex");
  } catch { return null; }
}

export async function initiallyDirtyPaths(repo) {
  const { stdout } = await execFileAsync("git", ["-C", repo, "status", "--porcelain=v1", "-z", "-uall"],
    { windowsHide: true, encoding: "buffer", maxBuffer: 4 * 1024 * 1024 });
  const entries = Buffer.isBuffer(stdout) ? stdout.toString("utf8") : String(stdout);
  const values = entries.split("\0");
  const dirty = new Set();
  for (let index = 0; index < values.length; index++) {
    const entry = values[index];
    if (!entry) continue;
    dirty.add(entry.slice(3).toLowerCase());
    if (/[RC]/.test(entry.slice(0, 2)) && values[index + 1]) dirty.add(values[++index].toLowerCase());
  }
  return dirty;
}

export async function gitCommitUnit(repo, message, paths, context) {
  if (typeof message !== "string" || !message.trim() || message.length > 120 || /[\r\n]/.test(message)) throw new ToolRejected("Mensagem de commit curta, sem quebra de linha, obrigatória.");
  if (!Array.isArray(paths) || !paths.length || paths.length > 32 || paths.some(value => typeof value !== "string")) throw new ToolRejected("Informe de 1 a 32 caminhos relativos da unidade funcional.");
  if (context.failedValidations.size) throw new ToolRejected("Validações falhas ainda pendentes; corrija e reexecute antes do commit.");
  const normalized = [];
  for (const relative of paths) {
    if (!relative || relative === "." || relative.startsWith("-")) throw new ToolRejected(`Caminho de commit inválido: ${relative}`);
    const target = await safeRepoPath(repo, relative);
    const clean = path.relative(repo, target).replaceAll(path.sep, "/");
    if (context.initiallyDirty.has(clean.toLowerCase())) throw new ToolRejected(`Arquivo já alterado antes deste job; não inclua trabalho preexistente no commit: ${clean}`);
    if (!context.touched.has(clean.toLowerCase()) && !context.required.has(clean.toLowerCase())) throw new ToolRejected(`Arquivo não alterado por esta unidade: ${clean}`);
    let parent = path.dirname(target);
    while (!(await fs.stat(parent).then(stat => stat.isDirectory()).catch(() => false)) && parent !== repo) parent = path.dirname(parent);
    const { stdout: root } = await execFileAsync("git", ["-C", parent, "rev-parse", "--show-toplevel"], { windowsHide: true, timeout: 5000 });
    if (path.resolve(root.trim()).toLowerCase() !== path.resolve(repo).toLowerCase()) throw new ToolRejected(`Repositório aninhado ou externo: ${clean}`);
    normalized.push(clean);
  }
  if (new Set(normalized.map(value => value.toLowerCase())).size !== normalized.length) throw new ToolRejected("Caminhos duplicados no commit.");
  const { stdout: changed } = await execFileAsync("git", ["-C", repo, "status", "--porcelain=v1", "--", ...normalized], { windowsHide: true, timeout: 5000 });
  if (!changed.trim()) throw new ToolRejected("Nenhuma alteração desses arquivos para registrar.");
  await execFileAsync("git", ["-C", repo, "diff", "--check", "--", ...normalized], { windowsHide: true, timeout: 5000 });
  const intent = [];
  let stdout;
  try {
    for (const relative of normalized) {
      const tracked = await execFileAsync("git", ["-C", repo, "ls-files", "--error-unmatch", "--", relative],
        { windowsHide: true, timeout: 5000 }).then(() => true).catch(() => false);
      if (!tracked) {
        await execFileAsync("git", ["-C", repo, "add", "-N", "--", relative], { windowsHide: true, timeout: 5000 });
        intent.push(relative);
      }
    }
    await execFileAsync("git", ["-C", repo, "diff", "--check", "--", ...normalized], { windowsHide: true, timeout: 5000 });
    ({ stdout } = await execFileAsync("git", ["-C", repo, "commit", "--only", "-m", message, "--", ...normalized],
      { windowsHide: true, timeout: 120_000, maxBuffer: 2 * 1024 * 1024 }));
  } catch (error) {
    for (const relative of intent) await execFileAsync("git", ["-C", repo, "reset", "-q", "--", relative],
      { windowsHide: true, timeout: 5000 }).catch(() => {});
    throw error;
  }
  const { stdout: sha } = await execFileAsync("git", ["-C", repo, "rev-parse", "HEAD"], { windowsHide: true, timeout: 5000 });
  return `Unidade funcional registrada em ${sha.trim()}: ${compact(stdout, 1000)}`;
}

async function fileFingerprint(repo, relativePath) {
  const file = await safeRepoPath(repo, relativePath);
  try {
    const stat = await fs.lstat(file);
    if (!stat.isFile()) throw new ToolRejected(`Caminho obrigatório não é arquivo regular: ${relativePath}`);
    return await sha256File(file);
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

async function readOptional(file) {
  try {
    return await fs.readFile(file, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") {
      return "";
    }

    throw error;
  }
}

async function findAgentInDir(dir) {
  try {
    const entries = await fs.readdir(dir, {
      withFileTypes: true,
    });

    const found = entries.find(
      (entry) => entry.isFile() && entry.name.toLowerCase() === "agents.md",
    );

    return found ? path.join(dir, found.name) : null;
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

async function applicableAgentFiles(repo, target) {
  const result = [];
  let current = path.resolve(repo);

  const targetAbs = path.resolve(target);
  const relative = path.relative(current, targetAbs);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    return result;
  }

  const parts = relative.split(path.sep).filter(Boolean);

  // Se target for arquivo, não trate o nome do arquivo como diretório.
  try {
    const stat = await fs.stat(targetAbs);

    if (stat.isFile()) {
      parts.pop();
    }
  } catch {
    // O caminho pode ainda não existir; nesse worker read-only
    // isso normalmente não ocorrerá.
  }

  const rootAgent = await findAgentInDir(current);

  if (rootAgent) {
    result.push(rootAgent);
  }

  for (const part of parts) {
    current = path.join(current, part);

    const agent = await findAgentInDir(current);

    if (agent) {
      result.push(agent);
    }
  }

  return result;
}

function relativeDisplay(repo, file) {
  const value = path.relative(repo, file);
  return value || ".";
}

async function attachInstructions(repo, target, deliveredInstructions, body) {
  const files = await applicableAgentFiles(repo, target);

  const additions = [];

  for (const file of files) {
    const key = file.toLowerCase();

    if (deliveredInstructions.has(key)) {
      continue;
    }

    deliveredInstructions.add(key);

    const text = await fs.readFile(file, "utf8");

    additions.push(
      [
        `--- INSTRUÇÃO DO REPOSITÓRIO: ${relativeDisplay(repo, file)} ---`,
        text,
        "--- FIM DA INSTRUÇÃO ---",
      ].join("\n"),
    );
  }

  if (additions.length === 0) {
    return body;
  }

  return additions.join("\n\n") + "\n\n" + body;
}

async function listDirectory(repo, relativePath, deliveredInstructions) {
  const target = await safeRepoPath(repo, relativePath ?? ".");

  const entries = await fs.readdir(target, {
    withFileTypes: true,
  });

  const result = entries
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 500)
    .map((entry) => {
      const suffix = entry.isDirectory() ? "/" : "";
      return `${entry.name}${suffix}`;
    })
    .join("\n");

  return attachInstructions(
    repo,
    target,
    deliveredInstructions,
    compact(result),
  );
}

async function repoTree(
  repo,
  relativePath,
  maxDepth,
  maxEntries,
  deliveredInstructions,
) {
  const root = await safeRepoPath(repo, relativePath ?? ".");

  const lines = [];
  const limitDepth = Math.max(0, Math.min(Number(maxDepth ?? 3), 6));

  const limitEntries = Math.max(10, Math.min(Number(maxEntries ?? 400), 1000));

  async function walk(dir, depth) {
    if (lines.length >= limitEntries) {
      return;
    }

    const entries = await fs.readdir(dir, {
      withFileTypes: true,
    });

    entries.sort((a, b) => a.name.localeCompare(b.name));

    for (const entry of entries) {
      if (lines.length >= limitEntries) {
        return;
      }

      if (entry.isSymbolicLink()) continue;

      if (entry.isDirectory() && SKIP_DIRS.has(entry.name)) {
        continue;
      }

      const full = path.join(dir, entry.name);
      const rel = relativeDisplay(repo, full);

      lines.push(entry.isDirectory() ? `${rel}/` : rel);

      if (entry.isDirectory() && depth < limitDepth) {
        await walk(full, depth + 1);
      }
    }
  }

  await walk(root, 0);

  let result = lines.join("\n");

  if (lines.length >= limitEntries) {
    result += `\n[limite atingido: ${limitEntries} entradas]`;
  }

  return attachInstructions(repo, root, deliveredInstructions, compact(result));
}

async function readTextFile(
  repo,
  relativePath,
  startLine,
  endLine,
  deliveredInstructions,
) {
  const target = await safeRepoPath(repo, relativePath);

  const stat = await fs.stat(target);

  if (!stat.isFile()) {
    throw new Error(`Não é arquivo: ${relativePath}`);
  }

  if (stat.size > 5 * 1024 * 1024) {
    throw new Error(
      `Arquivo excessivamente grande para leitura textual: ${relativePath}`,
    );
  }

  const text = await fs.readFile(target, "utf8");

  if (text.includes("\0")) {
    throw new Error(`Arquivo aparentemente binário: ${relativePath}`);
  }

  const lines = text.split(/\r?\n/);

  const start = Math.max(1, Number(startLine ?? 1));

  const requestedEnd = Number(endLine ?? start + 299);

  const end = Math.min(
    lines.length,
    start + MAX_FILE_LINES - 1,
    Math.max(start, requestedEnd),
  );

  const body = [];

  for (let i = start; i <= end; i++) {
    body.push(`${String(i).padStart(6, " ")} | ${lines[i - 1]}`);
  }

  const header =
    `${relativeDisplay(repo, target)} ` +
    `[linhas ${start}-${end}/${lines.length}]`;

  return attachInstructions(
    repo,
    target,
    deliveredInstructions,
    compact(`${header}\n${body.join("\n")}`),
  );
}

async function collectFiles(root, maxFiles = 20_000) {
  const result = [];

  async function walk(dir) {
    if (result.length >= maxFiles) {
      return;
    }

    let entries;

    try {
      entries = await fs.readdir(dir, {
        withFileTypes: true,
      });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (result.length >= maxFiles) {
        return;
      }

      if (entry.isSymbolicLink()) continue;

      if (entry.isDirectory() && SKIP_DIRS.has(entry.name)) {
        continue;
      }

      const full = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.isFile()) {
        result.push(full);
      }
    }
  }

  await walk(root);
  return result;
}

async function searchText(
  repo,
  relativePath,
  query,
  regex,
  caseSensitive,
  maxMatches,
  deliveredInstructions,
) {
  const root = await safeRepoPath(repo, relativePath ?? ".");

  const files = await collectFiles(root);

  const limit = Math.max(1, Math.min(Number(maxMatches ?? 100), 300));

  let matcher;

  if (regex) {
    matcher = new RegExp(query, caseSensitive ? "" : "i");
  }

  const needle = caseSensitive ? query : query.toLowerCase();

  const results = [];
  const touchedInstructionTargets = new Set();

  for (const file of files) {
    if (results.length >= limit) {
      break;
    }

    let stat;

    try {
      stat = await fs.stat(file);
    } catch {
      continue;
    }

    if (stat.size > MAX_SEARCH_FILE_BYTES) {
      continue;
    }

    let text;

    try {
      text = await fs.readFile(file, "utf8");
    } catch {
      continue;
    }

    if (text.includes("\0")) {
      continue;
    }

    const lines = text.split(/\r?\n/);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      const matched = regex
        ? matcher.test(line)
        : caseSensitive
          ? line.includes(needle)
          : line.toLowerCase().includes(needle);

      if (!matched) {
        continue;
      }

      results.push(`${relativeDisplay(repo, file)}:${i + 1}: ${line}`);

      touchedInstructionTargets.add(file);

      if (results.length >= limit) {
        break;
      }
    }
  }

  let prefix = "";

  // Entrega automaticamente ao modelo quaisquer AGENTS.md
  // aplicáveis aos arquivos retornados pela busca.
  for (const target of touchedInstructionTargets) {
    const augmented = await attachInstructions(
      repo,
      target,
      deliveredInstructions,
      "",
    );

    if (augmented.trim()) {
      prefix += augmented.trim() + "\n\n";
    }
  }

  const body =
    results.length > 0 ? results.join("\n") : "Nenhuma ocorrência encontrada.";

  return compact(prefix + body);
}

async function gitStatus(repo) {
  const { stdout, stderr } = await execFileAsync(
    "git",
    ["-C", repo, "status", "--short", "--branch"],
    {
      windowsHide: true,
      maxBuffer: 2 * 1024 * 1024,
    },
  );
  let tracking = "upstream=ausente; ahead=indisponível; behind=indisponível";
  try {
    const upstream = (await execFileAsync("git", ["-C", repo, "rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{upstream}"],
      { windowsHide: true })).stdout.trim();
    const counts = (await execFileAsync("git", ["-C", repo, "rev-list", "--left-right", "--count", "HEAD...@{upstream}"],
      { windowsHide: true })).stdout.trim().split(/\s+/).map(Number);
    if (counts.length === 2 && counts.every(Number.isInteger)) {
      tracking = `upstream=${upstream}; ahead=${counts[0]}; behind=${counts[1]}`;
    }
  } catch {}
  return compact(`${stdout || stderr || "(sem saída)"}\nESTADO GIT DETERMINÍSTICO: ${tracking}. ` +
    "Arquivos modificados no working tree não significam commits à frente do upstream.");
}

async function gitDiff(repo, staged) {
  const args = ["-C", repo, "diff"];

  if (staged) {
    args.push("--cached");
  }

  const { stdout, stderr } = await execFileAsync("git", args, {
    windowsHide: true,
    maxBuffer: 8 * 1024 * 1024,
  });

  return compact(stdout || stderr || "(diff vazio)");
}

const TOOL_DEFINITIONS = [
  {
    type: "function",
    function: {
      name: "repo_tree",
      description:
        "Mostra uma árvore limitada do repositório. Use para compreender rapidamente a estrutura antes de leituras detalhadas.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "Caminho relativo ao repositório. Padrão: .",
          },
          maxDepth: {
            type: "integer",
            description: "Profundidade máxima, entre 0 e 6.",
          },
          maxEntries: {
            type: "integer",
            description: "Máximo de entradas retornadas, até 1000.",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_dir",
      description: "Lista diretamente um diretório do repositório.",
      parameters: {
        type: "object",
        required: ["path"],
        properties: {
          path: {
            type: "string",
            description: "Caminho relativo ao repositório.",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "read_file",
      description:
        "Lê trecho de arquivo textual do repositório com números de linha. AGENTS.md aplicáveis são fornecidos automaticamente.",
      parameters: {
        type: "object",
        required: ["path"],
        properties: {
          path: {
            type: "string",
          },
          startLine: {
            type: "integer",
          },
          endLine: {
            type: "integer",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_text",
      description:
        "Pesquisa conteúdo textual recursivamente no repositório. Não pesquisa diretórios gerados/pesados ignorados pelo worker.",
      parameters: {
        type: "object",
        required: ["query"],
        properties: {
          path: {
            type: "string",
            description: "Subdiretório relativo. Padrão: .",
          },
          query: {
            type: "string",
          },
          regex: {
            type: "boolean",
          },
          caseSensitive: {
            type: "boolean",
          },
          maxMatches: {
            type: "integer",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "git_status",
      description: "Obtém git status --short --branch. Somente leitura.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "git_diff",
      description: "Obtém o diff atual do Git. Somente leitura.",
      parameters: {
        type: "object",
        properties: {
          staged: {
            type: "boolean",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "git_commit_unit",
      description: "Após validar uma unidade funcional autônoma, registra commit somente dos caminhos desta unidade; recusa mudanças preexistentes ou de terceiros.",
      parameters: { type: "object", required: ["message", "paths"], properties: {
        message: { type: "string" }, paths: { type: "array", items: { type: "string" } },
      } },
    },
  },
  {
    type: "function",
    function: {
      name: "file_info",
      description: "Lê tamanho e SHA-256 de arquivo regular dentro do repositório. Somente leitura.",
      parameters: { type: "object", required: ["path"], properties: { path: { type: "string" } } },
    },
  },
  {
    type: "function",
    function: {
      name: "write_file",
      description: "Cria ou substitui arquivo textual dentro do workspace, sem atravessar links.",
      parameters: { type: "object", required: ["path", "content"], properties: {
        path: { type: "string" }, content: { type: "string" },
      } },
    },
  },
  {
    type: "function",
    function: {
      name: "move_file",
      description: "Move arquivo regular dentro do repositório sem sobrescrever destino; exige SHA-256 previamente consultado.",
      parameters: { type: "object", required: ["from", "to", "expected_sha256"], properties: {
        from: { type: "string" }, to: { type: "string" }, expected_sha256: { type: "string" },
      } },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_file",
      description: "Remove arquivo regular dentro do repositório com backup recuperável; exige SHA-256 previamente consultado.",
      parameters: { type: "object", required: ["path", "expected_sha256"], properties: {
        path: { type: "string" }, expected_sha256: { type: "string" },
      } },
    },
  },
  {
    type: "function",
    function: {
      name: "run_authorized_command",
      description: "Executa pelo ID um comando exato previamente autorizado pelo supervisor para este job, sem shell ou argumentos livres.",
      parameters: { type: "object", required: ["id"], properties: { id: { type: "string" } } },
    },
  },
  {
    type: "function",
    function: {
      name: "edit_file",
      description: "Substitui uma ocorrência textual única no arquivo do workspace.",
      parameters: { type: "object", required: ["path", "before", "after"], properties: {
        path: { type: "string" }, before: { type: "string" }, after: { type: "string" },
      } },
    },
  },
  {
    type: "function",
    function: {
      name: "run_command",
      description: "Executa node, npm ou git no workspace para build, teste ou revisão. Argumentos separados.",
      parameters: { type: "object", required: ["program", "args"], properties: {
        program: { type: "string" }, args: { type: "array", items: { type: "string" } },
      } },
    },
  },
  {
    type: "function",
    function: {
      name: "delegate_readonly_subagent",
      description: "Delega investigação independente e delimitada a um subagente Ollama local somente quando houver ganho claro; retorna evidências compactas. Sem escrita, rede ou nova delegação.",
      parameters: { type: "object", required: ["task"], properties: { task: { type: "string" } } },
    },
  },
  {
    type: "function",
    function: {
      name: "context_recall",
      description: "Reidrata trecho exato de mensagem arquivada no checkpoint deste job; use antes de depender de evidência ou decisão resumida.",
      parameters: { type: "object", required: ["checkpoint_id", "entry_index"], properties: {
        checkpoint_id: { type: "string" }, entry_index: { type: "integer" }, char_offset: { type: "integer" },
      } },
    },
  },
];

const READ_ONLY_TOOLS = new Set(["repo_tree", "list_dir", "read_file", "search_text", "git_status", "git_diff", "file_info", "delegate_readonly_subagent", "context_recall"]);

function parseArguments(value) {
  if (value && typeof value === "object") {
    return value;
  }

  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      throw new Error(`Argumentos de ferramenta inválidos: ${value}`);
    }
  }

  return {};
}

async function executeTool(repo, call, deliveredInstructions, mode, authorizedCommands, commitContext) {
  const name = call?.function?.name;
  const args = parseArguments(call?.function?.arguments);
  if (mode === "read-only" && !READ_ONLY_TOOLS.has(name)) {
    throw new ToolRejected(`Ferramenta recusada em modo read-only: ${name}`);
  }

  switch (name) {
    case "repo_tree":
      return repoTree(
        repo,
        args.path ?? ".",
        args.maxDepth ?? 3,
        args.maxEntries ?? 400,
        deliveredInstructions,
      );

    case "list_dir":
      return listDirectory(repo, args.path ?? ".", deliveredInstructions);

    case "read_file":
      return readTextFile(
        repo,
        args.path,
        args.startLine,
        args.endLine,
        deliveredInstructions,
      );

    case "search_text":
      return searchText(
        repo,
        args.path ?? ".",
        args.query,
        Boolean(args.regex),
        Boolean(args.caseSensitive),
        args.maxMatches ?? 100,
        deliveredInstructions,
      );

    case "git_status":
      return gitStatus(repo);

    case "git_diff":
      return gitDiff(repo, Boolean(args.staged));

    case "git_commit_unit":
      return gitCommitUnit(repo, args.message, args.paths, commitContext);

    case "file_info":
      return fileInfo(repo, args.path);

    case "write_file":
      return writeTextFile(repo, args.path, args.content);

    case "edit_file":
      return editTextFile(repo, args.path, args.before, args.after);

    case "move_file":
      return moveFile(repo, args.from, args.to, args.expected_sha256);

    case "delete_file":
      return deleteFile(repo, args.path, args.expected_sha256);

    case "run_authorized_command":
      return runAuthorizedCommand(repo, args.id, authorizedCommands);

    case "run_command":
      return runCheckedCommand(repo, args.program, args.args);

    default:
      throw new Error(`Ferramenta desconhecida: ${name}`);
  }
}

function errorChain(error) {
  const parts = [];
  for (let current = error, depth = 0; current && depth < 4; current = current.cause, depth++) {
    parts.push(`${current.name ?? "Error"}: ${current.message ?? String(current)}${current.code ? ` [${current.code}]` : ""}`);
  }
  return parts.join("; cause: ");
}

function safeToolDiagnostic(error) {
  return String(error?.message ?? error).replace(/\b(token|secret|password|authorization)\s*[:=]\s*\S+/gi, "$1=[redacted]")
    .replace(/\s+/g, " ").slice(0, 360);
}

function ollamaPostJson(body, signal, route = "api/chat", method = "POST") {
  const endpoint = new URL(route, OLLAMA_URL.endsWith("/") ? OLLAMA_URL : `${OLLAMA_URL}/`);
  const transport = endpoint.protocol === "http:" ? http : endpoint.protocol === "https:" ? https : null;
  if (!transport) throw new Error(`Ollama: protocolo inválido ${endpoint.protocol}`);
  return new Promise((resolve, reject) => {
    const request = transport.request(endpoint, {
      method, headers: body == null ? {} : { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) }, signal,
    }, response => {
      const chunks = [];
      let bytes = 0;
      response.on("data", chunk => {
        bytes += chunk.length;
        if (bytes > MAX_OLLAMA_RESPONSE_BYTES) {
          response.destroy(new Error("Ollama: resposta excedeu o limite de 32 MiB"));
          return;
        }
        chunks.push(chunk);
      });
      response.on("error", reject);
      response.on("end", () => {
        const text = Buffer.concat(chunks).toString("utf8");
        if ((response.statusCode ?? 0) < 200 || (response.statusCode ?? 0) >= 300) {
          const error = new Error(`Ollama HTTP ${response.statusCode}: ${compact(text, 1000)}`);
          error.status = response.statusCode;
          reject(error);
          return;
        }
        try { resolve(JSON.parse(text)); }
        catch (error) { reject(new Error("Ollama retornou JSON inválido", { cause: error })); }
      });
    });
    request.on("error", reject);
    request.end(body ?? undefined);
  });
}

export function estimateGpuLayersR8N(blockCount, sizeBytes, vramBytes, freeMiB, reserveMiB, previous = null) {
  if (![blockCount, sizeBytes, vramBytes, freeMiB, reserveMiB].every(Number.isFinite) ||
      !Number.isInteger(blockCount) || blockCount < 1 || sizeBytes <= 0 || vramBytes <= 0) return null;
  const safetyMiB = Math.max(512, Math.ceil(reserveMiB / 2));
  const targetBytes = Math.max(0, vramBytes - (Math.max(0, reserveMiB - freeMiB) + safetyMiB) * 1048576);
  const estimated = Math.max(0, Math.min(blockCount, Math.floor(targetBytes / (sizeBytes / blockCount))));
  return previous == null ? estimated : Math.min(estimated, Math.max(0, previous - 1));
}

async function estimateLoadedModelGpuLayersR8N(gpu, previous) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const [ps, show] = await Promise.all([
      ollamaPostJson(null, controller.signal, "api/ps", "GET"),
      ollamaPostJson(JSON.stringify({ model: MODEL }), controller.signal, "api/show"),
    ]);
    const loaded = ps.models?.find(item => item.name === MODEL || item.name === `${MODEL}:latest`);
    const blockCount = Object.entries(show.model_info ?? {}).find(([key, value]) => key.endsWith(".block_count") && Number.isInteger(value))?.[1];
    return estimateGpuLayersR8N(blockCount, loaded?.size, loaded?.size_vram,
      gpu.freeMiB, gpu.reserveMiB, previous);
  } catch { return null; }
  finally { clearTimeout(timer); }
}

export async function relieveGpuPressureR8N(sampleGpu, unloadModel, onProgress = async () => {}) {
  const gpu = await sampleGpu();
  if (!gpu || gpu.allow) return false;
  await onProgress({ phase: "resource_pressure", reason: "VRAM livre caiu abaixo da reserva após inferência",
    gpu_free_mib: gpu.freeMiB, gpu_reserve_mib: gpu.reserveMiB });
  try {
    await unloadModel();
    await onProgress({ phase: "resource_released", reason: "Modelo descarregado após pressão de VRAM",
      gpu_free_mib: gpu.freeMiB, gpu_reserve_mib: gpu.reserveMiB });
    return true;
  } catch (error) {
    await onProgress({ phase: "resource_release_error", error: safeToolDiagnostic(error),
      gpu_free_mib: gpu.freeMiB, gpu_reserve_mib: gpu.reserveMiB });
    return false;
  }
}

export async function unloadWorkerModelR8N() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    await ollamaPostJson(JSON.stringify({ model: MODEL, keep_alive: 0, stream: false }), controller.signal, "api/generate");
  } finally { clearTimeout(timer); }
}

async function ollamaChat(messages, tools, timeoutMs, onProgress = async () => {}, gpuPolicy = { layers: null }, contextTokens = CONTEXT_TOKENS_C7M) {
  const deadline = Number.isFinite(timeoutMs) ? Date.now() + timeoutMs : Infinity;
  for (let attempt = 1; attempt <= OLLAMA_ATTEMPTS; attempt++) {
    const budget = await awaitResourceBudgetR8N(deadline, onProgress);
    await onProgress({ phase: "resource_budget", cpu_threads: budget.threads, cpu_cores_reserved: budget.reservedCores,
      ram_available_bytes: budget.ramAvailable, ram_reserve_bytes: budget.ramReserve,
      gpu_free_mib: budget.gpu?.freeMiB ?? null, gpu_reserve_mib: budget.gpu?.reserveMiB ?? null,
      gpu_layers: gpuPolicy.layers });
    const options = { temperature: 0.1, num_thread: budget.threads, num_ctx: contextTokens };
    if (gpuPolicy.layers !== null) options.num_gpu = gpuPolicy.layers;
    const body = JSON.stringify({
      model: MODEL, messages, tools, stream: false, truncate: false, shift: false, keep_alive: OLLAMA_KEEP_ALIVE_R8N,
      options,
    });
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new Error("Ollama: timeout total esgotado.");
    const controller = new AbortController();
    const timer = Number.isFinite(remaining) ? setTimeout(() => controller.abort(), remaining) : null;
    try {
      await onProgress({ phase: "ollama_request", attempt });
      const result = await ollamaPostJson(body, controller.signal);
      await onProgress({ phase: "ollama_response", attempt,
        prompt_tokens: result.prompt_eval_count ?? null,
        output_tokens: result.eval_count ?? null,
        eval_duration_ms: result.eval_duration == null ? null : Math.round(result.eval_duration / 1e6) });
      const postGpu = await gpuMemoryBudgetR8N();
      if (postGpu && !postGpu.allow) {
        const nextLayers = await estimateLoadedModelGpuLayersR8N(postGpu, gpuPolicy.layers);
        if (nextLayers !== null) {
          gpuPolicy.layers = nextLayers;
          await onProgress({ phase: "gpu_layers_adjusted", gpu_layers: nextLayers,
            gpu_free_mib: postGpu.freeMiB, gpu_reserve_mib: postGpu.reserveMiB });
          try {
            await saveGpuPolicyR8N(postGpu, nextLayers, budget.gpu?.freeMiB ?? postGpu.freeMiB);
            await onProgress({ phase: "gpu_policy_saved", gpu_layers: nextLayers });
          } catch (error) {
            await onProgress({ phase: "gpu_policy_save_error", error: safeToolDiagnostic(error) });
          }
        }
        await relieveGpuPressureR8N(async () => postGpu, unloadWorkerModelR8N, onProgress);
      }
      return result;
    } catch (error) {
      const retryable = error instanceof TypeError || error?.name === "AbortError" || TRANSIENT_OLLAMA_CODES.has(error?.code) || Number(error?.status) >= 500;
      await onProgress({ phase: "ollama_error", attempt, error: errorChain(error), retryable });
      if (error?.status === 400 && /context|token|truncate|too long/i.test(error.message)) {
        throw new WorkerIncompleteError(`WORKER_INCOMPLETE: Ollama recusou o contexto sem truncamento; checkpoint não bastou ou instruções fixas excedem a janela. ${safeToolDiagnostic(error)}. Segmente a continuação preservando os artefatos do job.`);
      }
      if (!retryable || attempt >= OLLAMA_ATTEMPTS || deadline - Date.now() <= 0) {
        throw new Error(`Ollama /api/chat falhou após ${attempt} tentativa(s): ${errorChain(error)}`, { cause: error });
      }
      const delay = Math.min([0, 5_000, 15_000, 45_000][attempt] ?? 45_000, Math.max(0, deadline - Date.now()));
      await new Promise(resolve => setTimeout(resolve, delay));
    } finally {
      if (timer !== null) clearTimeout(timer);
    }
  }
}

export class WorkerIncompleteError extends Error {}

export async function runLocalAnalysis(repoPath, task, mode = "read-only", onProgress = async () => {}, authorizedCommands = [], expectChanges = false, requiredChangePaths = [], requireCommits = false, subagentDepth = 0, stepLimit = MAX_STEPS) {
  if (![0, 1].includes(subagentDepth) || !Number.isSafeInteger(stepLimit) || stepLimit < 1 || stepLimit > MAX_STEPS) {
    throw new Error("Limites de subagente inválidos");
  }
  if (!Array.isArray(authorizedCommands) || (mode !== "write" && authorizedCommands.length)) {
    throw new Error("Comandos autorizados exigem modo write e lista válida");
  }
  if (!Array.isArray(requiredChangePaths) || (mode !== "write" && requiredChangePaths.length) ||
      requiredChangePaths.some(value => typeof value !== "string" || !value || path.isAbsolute(value)) ||
      (requiredChangePaths.length && !expectChanges)) {
    throw new Error("required_change_paths exige mode=write e expect_changes=true");
  }
  const commandIds = new Set();
  for (const command of authorizedCommands) {
    if (!/^[a-z0-9][a-z0-9_-]{0,63}$/i.test(command?.id ?? "") || commandIds.has(command.id) ||
        typeof command.program !== "string" || !path.isAbsolute(command.program) || /[\r\n]/.test(command.program) ||
        !Array.isArray(command.args) || command.args.some(arg => typeof arg !== "string" || /[\r\n]/.test(arg))) {
      throw new Error("Especificação de comando autorizado inválida ou duplicada");
    }
    commandIds.add(command.id);
  }
  const repo = path.resolve(repoPath);

  const stat = await fs.stat(repo);

  if (!stat.isDirectory()) {
    throw new Error(`repoPath não é diretório: ${repo}`);
  }

  // Prova explícita de que O PRÓPRIO MCP enxerga o filesystem.
  const probe = await fs.readdir(repo);

  console.error(
    `[localWorker] filesystem OK: ${repo}; entries=${probe.length}`,
  );

  const workerRules = await readOptional(WORKER_RULES);
  if (!workerRules.trim()) throw new Error(`WORKER_INFRA_ERROR: AGENTS.md global ausente ou vazio: ${WORKER_RULES}`);

  const rootAgentFile = await findAgentInDir(repo);
  const rootAgent = rootAgentFile
    ? await fs.readFile(rootAgentFile, "utf8")
    : "";
  const localAgentFile = path.join(repo, "agents.local.md");
  const localAgent = await readOptional(localAgentFile);
  const preScan = [
    `Raiz: ${repo}`,
    `Entradas imediatas (${probe.length}): ${probe.slice(0, 100).join(", ")}`,
  ];
  for (const name of ["package.json", "Gemfile", "_config.yml"]) {
    const value = await readOptional(path.join(repo, name));
    if (value) preScan.push(`${name}:\n${compact(value, 3000)}`);
  }
  try { preScan.push(`git status:\n${await gitStatus(repo)}`); }
  catch { preScan.push("git status indisponível"); }

  const deliveredInstructions = new Set();

  if (rootAgentFile) {
    deliveredInstructions.add(rootAgentFile.toLowerCase());
  }
  if (localAgent) deliveredInstructions.add(localAgentFile.toLowerCase());

  const system = `
Você é o worker local Qwen subordinado a um supervisor OpenAI mais capaz.

Sua função é absorver exploração e análise volumosa localmente, sem transferir trabalho desnecessário ao supervisor.

REGRAS GLOBAIS DO WORKER:
${workerRules || "(nenhum AGENTS.md global encontrado)"}

INSTRUÇÕES RAIZ DO REPOSITÓRIO ALVO (${repo}):
${rootAgent || "(nenhum AGENTS.md na raiz)"}

ADAPTAÇÃO LOCAL EXCLUSIVA DA RAIZ ALVO (${repo}):
${localAgent || "(nenhum agents.local.md na raiz)"}

REGRAS OPERACIONAIS ADICIONAIS:

- Responda integralmente em português do Brasil.
- Modo da tarefa: ${mode}. Em read-only, nenhuma ferramenta de escrita ou comando é disponibilizada.
- Alterações obrigatórias neste job: ${expectChanges ? "sim; implemente antes da resposta final" : "não especificado"}.
- Arquivos que precisam de mudança líquida neste job: ${requiredChangePaths.length ? requiredChangePaths.join(", ") : "nenhum alvo declarado"}.
- Comandos exatos autorizados para este job: ${authorizedCommands.length ? JSON.stringify(authorizedCommands.map(({ id, description }) => ({ id, description }))) : "nenhum"}. Use somente run_authorized_command com um ID listado; não invente argumentos.
- Alterações só são permitidas quando a tarefa recebida as autorizar; preserve arquivos pessoais e dados existentes.
- Use obrigatoriamente as ferramentas fornecidas para estabelecer fatos sobre o repositório.
- Não confie em conhecimento prévio, nomes de projeto ou suposições.
- Toda afirmação factual específica sobre o repositório deve ser sustentada por evidência obtida nesta execução.
- Não imagine arquivos, arquitetura, dependências, comportamento, testes ou riscos.
- Não extrapole lacunas.
- Antes de concluir sobre um arquivo ou módulo, leia evidência suficiente.
- AGENTS.md aplicáveis aos caminhos acessados são entregues automaticamente pelas ferramentas e são obrigatórios.
- Nunca importe agents.local.md, hooks, Skills, Subagents, scripts ou configurações de outro repositório; verifique sua existência e aplicabilidade apenas na raiz alvo e em sua governança.
- Skills, scripts, hooks e Subagents previstos nas regras aplicáveis são obrigatórios quando seus gatilhos e condições forem satisfeitos. Use o mecanismo oficial e respeite sua precedência; não alegue execução sem ferramenta/evidência. Comando adicional exige ID exato autorizado pelo supervisor.
- Subagente local disponível apenas para investigação isolada em modo read-only, sem nova delegação. Use somente quando houver ganho líquido verificável.
- Instruções mais específicas de subdiretório prevalecem sobre as mais gerais dentro de seu escopo.
- Não afirme que teste/comando foi executado se não foi.
- Não execute rede.
- Não peça ao supervisor conteúdo que pode ser obtido pelas ferramentas.
- NEEDS_SUPERVISOR serve apenas para ambiguidade, conflito ou decisão intelectual/material que exija autoridade do supervisor.
- Falha de ferramenta, filesystem, Ollama ou ambiente é WORKER_INFRA_ERROR, nunca NEEDS_SUPERVISOR.
- Seja econômico na leitura: comece por árvore, manifestos, configurações e buscas direcionadas.
- Ao finalizar, seja conciso e forneça caminhos/linhas quando disponíveis.

FORMATO FINAL:

RESULTADO
...

EVIDÊNCIAS
...

RISCOS/LIMITAÇÕES
...

NEEDS_SUPERVISOR
...
`.trim();

  const messages = [
    {
      role: "system",
      content: system,
    },
    {
      role: "user",
      content: `
REPOSITÓRIO:
${repo}

PRÉ-INSPEÇÃO DETERMINÍSTICA:
${preScan.join("\n\n")}

TAREFA DELEGADA:
${task}

Inspecione de fato o repositório com as ferramentas antes de responder.
`.trim(),
    },
  ];

  const currentJobId = process.env.LOCAL_WORKER_JOB_ID;
  const contextDirectory = subagentDepth === 0 && currentJobId ? jobDir(currentJobId) : null;
  const contextManager = new ContextManagerC7M(contextDirectory, CONTEXT_TOKENS_C7M, MIN_CONTEXT_TOKENS_C7M);

  const startedAt = Date.now();
  const gpuPolicy = { layers: await loadGpuPolicyR8N() };
  if (gpuPolicy.layers !== null) await onProgress({ phase: "gpu_policy_loaded", gpu_layers: gpuPolicy.layers });
  let toolExecutions = 0;
  let forcedInspection = false;
  let successfulMutations = 0;
  let forcedImplementation = false;
  let forcedValidation = false;
  const failedValidations = new Set();
  const ownedPath = value => path.relative(repo, path.resolve(repo, value)).replaceAll(path.sep, "/").toLowerCase();
  const commitContext = { failedValidations, initiallyDirty: mode === "write" ? await initiallyDirtyPaths(repo) : new Set(),
    touched: new Set(), required: new Set(requiredChangePaths.map(ownedPath)), commits: 0 };
  const seenReads = new Map();
  const rejectedCalls = new Map();
  const rejectedCategories = new Map();
  const blockedCalls = new Set();
  const requiredHashes = new Map();
  for (const requiredPath of requiredChangePaths) requiredHashes.set(requiredPath, await fileFingerprint(repo, requiredPath));
  const startingGitFingerprint = expectChanges ? await gitChangeFingerprint(repo) : null;
  const unchangedRequiredPaths = async () => {
    const unchanged = [];
    for (const [requiredPath, initialHash] of requiredHashes) {
      if (await fileFingerprint(repo, requiredPath) === initialHash) unchanged.push(requiredPath);
    }
    return unchanged;
  };

  for (let step = 0; step < stepLimit; step++) {
    await onProgress({ phase: "step", step: step + 1 });
    if (expectChanges && successfulMutations === 0 && step + 1 === WRITE_NUDGE_STEP) {
      messages.push({ role: "user", content: "Orçamento de exploração em 25%. Identifique agora o menor arquivo a modificar e faça a primeira edição autorizada; leituras adicionais somente se indispensáveis para essa edição." });
      await onProgress({ phase: "write_budget_warning", step: step + 1, reason: "nenhuma alteração bem-sucedida" });
    }
    if (expectChanges && successfulMutations === 0 && step + 1 === WRITE_FOCUS_STEP) {
      messages.push({ role: "user", content: "Metade dos ciclos foi consumida sem edição. Pare listagens e reexploração; implemente a unidade pedida com a evidência já obtida. Se houver bloqueio material, explique-o em resposta final verificável." });
      await onProgress({ phase: "write_budget_warning", step: step + 1, reason: "metade dos ciclos sem alteração" });
    }
    const elapsed = Date.now() - startedAt;
    const remaining = TOTAL_TIMEOUT_MS === 0 ? Infinity : TOTAL_TIMEOUT_MS - elapsed;

    if (remaining <= 0) {
      throw new Error("WORKER_INFRA_ERROR: timeout total do worker local.");
    }

    let availableTools = mode === "read-only"
      ? TOOL_DEFINITIONS.filter(tool => READ_ONLY_TOOLS.has(tool.function.name))
      : TOOL_DEFINITIONS.filter(tool => tool.function.name !== "run_authorized_command" || authorizedCommands.length);
    if (subagentDepth > 0) availableTools = availableTools.filter(tool => tool.function.name !== "delegate_readonly_subagent");
    if (forcedInspection && toolExecutions === 0) {
      availableTools = availableTools.filter(tool => tool.function.name === "git_status");
    }
    if (expectChanges && successfulMutations === 0 && step + 1 >= WRITE_FOCUS_STEP) {
      availableTools = availableTools.filter(tool => !new Set(["repo_tree", "list_dir"]).has(tool.function.name));
    }
    if (!contextManager.checkpoints.length) availableTools = availableTools.filter(tool => tool.function.name !== "context_recall");
    const ramSample = resourceBudgetR8N(os.availableParallelism(), os.totalmem(), os.freemem());
    const gpuSample = await gpuMemoryBudgetR8N();
    await contextManager.prepare(messages, availableTools, { ram: ramSample, gpu: gpuSample,
      sampleRam: () => os.freemem(), sampleGpu: gpuMemoryBudgetR8N }, onProgress);
    if (contextManager.checkpoints.length && !availableTools.some(tool => tool.function.name === "context_recall") &&
        !(forcedInspection && toolExecutions === 0)) {
      availableTools.push(TOOL_DEFINITIONS.find(tool => tool.function.name === "context_recall"));
    }
    const response = await ollamaChat(messages, availableTools, remaining, onProgress, gpuPolicy, contextManager.contextTokens);
    await contextManager.observed(response?.prompt_eval_count,
      { ram: os.freemem(), gpu: await gpuMemoryBudgetR8N() }, onProgress);

    const message = response?.message;

    if (!message) {
      throw new Error(
        "WORKER_INFRA_ERROR: Ollama retornou resposta sem message.",
      );
    }

    const calls = Array.isArray(message.tool_calls) ? message.tool_calls : [];

    if (calls.length === 0) {
      const finalText = String(message.content ?? "").trim();

      // Impede resposta "de cabeça" sem examinar o repo.
      if (toolExecutions === 0) {
        if (forcedInspection) throw new WorkerIncompleteError("WORKER_INCOMPLETE: resposta final sem inspeção bem-sucedida após orientação explícita.");
        forcedInspection = true;

        messages.push(message);
        messages.push({
          role: "user",
          content:
            "Você ainda não inspecionou o repositório. A próxima resposta deve chamar a única ferramenta disponível, git_status, antes de qualquer conclusão factual.",
        });

        continue;
      }

      if (!finalText) {
        throw new Error(
          "WORKER_INFRA_ERROR: worker terminou sem resposta final.",
        );
      }

      const missingPaths = expectChanges ? await unchangedRequiredPaths() : [];
      const noNetGitChange = expectChanges && startingGitFingerprint &&
        await gitChangeFingerprint(repo) === startingGitFingerprint;
      if (expectChanges && (successfulMutations === 0 || missingPaths.length || noNetGitChange)) {
        if (forcedImplementation) {
          throw new WorkerIncompleteError(`WORKER_INCOMPLETE: alteração obrigatória não comprovada; caminhos inalterados: ${missingPaths.join(", ") || "nenhum"}; Git sem mudança líquida: ${Boolean(noNetGitChange)}. Última resposta: ${compact(finalText, 3000)}`);
        }
        forcedImplementation = true;
        messages.push(message);
        messages.push({ role: "user", content: `A tarefa exige alteração líquida comprovada. Caminhos obrigatórios ainda inalterados: ${missingPaths.join(", ") || "nenhum"}. Git sem mudança líquida: ${Boolean(noNetGitChange)}. Corrija antes de concluir; se houver impedimento real, descreva-o em NEEDS_SUPERVISOR.` });
        await onProgress({ phase: "change_requirement", step: step + 1, missing_paths: missingPaths, no_net_git_change: Boolean(noNetGitChange) });
        continue;
      }

      if (failedValidations.size) {
        const pending = [...failedValidations];
        if (forcedValidation) throw new WorkerIncompleteError(`WORKER_INCOMPLETE: validações falharam e não passaram novamente: ${pending.join(", ")}. Última resposta: ${compact(finalText, 3000)}`);
        forcedValidation = true;
        messages.push(message);
        messages.push({ role: "user", content: `Validações obrigatórias falharam: ${pending.join(", ")}. Corrija a causa e execute novamente cada comando até passar antes de concluir. Se houver impedimento real, documente-o; não declare teste falho como sucesso.` });
        await onProgress({ phase: "validation_requirement", step: step + 1, pending });
        continue;
      }

      if (requireCommits && expectChanges && successfulMutations > 0) {
        const owned = [...new Set([...commitContext.touched, ...commitContext.required])];
        const { stdout: pending } = owned.length ? await execFileAsync("git", ["-C", repo, "status", "--porcelain=v1", "--", ...owned], { windowsHide: true, timeout: 5000 }) : { stdout: "" };
        if (commitContext.commits === 0 || pending.trim()) {
          if (commitContext.commitReminder) throw new WorkerIncompleteError(`WORKER_INCOMPLETE: unidade funcional sem commit próprio ou com alterações pendentes; commits=${commitContext.commits}; pendências=${compact(pending, 1000)}`);
          commitContext.commitReminder = true;
          messages.push(message);
          messages.push({ role: "user", content: "A unidade funcional validada requer commit próprio. Use git_commit_unit apenas nos arquivos produzidos neste job; não inclua alterações preexistentes. Se impedido, informe a causa exata ao supervisor." });
          continue;
        }
      }

      return compact(finalText, MAX_FINAL_CHARS);
    }

    messages.push(message);

    for (const call of calls) {
      const toolName = call?.function?.name ?? "unknown";
      let args = {};
      try { args = parseArguments(call?.function?.arguments); } catch {}
      const resource = typeof args.path === "string" ? args.path :
        typeof args.from === "string" ? args.from : null;
      const startedTool = Date.now();
      await onProgress({ phase: "tool", step: step + 1, tool: toolName, resource });
      let result;
      let outcome = "ok";
      let diagnostic = null;
      const validationId = toolName === "run_authorized_command" && authorizedCommands.some(item => item.id === args.id)
        ? `autorizado:${args.id}`
        : toolName === "run_command" && ["node", "npm"].includes(args.program)
          ? `comando:${JSON.stringify([args.program, args.args])}` : null;
      const callSignature = JSON.stringify([toolName, args]);

      try {
        if (blockedCalls.has(callSignature)) throw new WorkerIncompleteError(`WORKER_INCOMPLETE: mesma chamada ${toolName} repetida após bloqueio determinístico; é preciso outra estratégia permitida ou autorização adicional do supervisor.`);
        if (new Set(["read_file", "list_dir", "repo_tree", "file_info", "search_text"]).has(toolName)) {
          const signature = JSON.stringify([toolName, args]);
          const count = (seenReads.get(signature) ?? 0) + 1;
          seenReads.set(signature, count);
          if (count > 2) throw new ToolRejected(`Consulta idêntica repetida ${count} vezes; use a evidência já obtida e avance para a implementação.`);
        }
        const beforeCommand = toolName === "run_authorized_command" && expectChanges ? await gitChangeFingerprint(repo) : null;
        if (toolName === "context_recall") {
          result = await contextManager.recall(args.checkpoint_id, args.entry_index, args.char_offset ?? 0);
        } else if (toolName === "delegate_readonly_subagent") {
          if (subagentDepth > 0) throw new ToolRejected("Subagente não pode criar outra delegação");
          if (typeof args.task !== "string" || !args.task.trim() || args.task.length > 1800) throw new ToolRejected("Objetivo do subagente deve ser texto não vazio de até 1800 caracteres");
          await onProgress({ phase: "subagent_started", step: step + 1, reason: "investigação local read-only" });
          result = await runLocalAnalysis(repo, args.task, "read-only", async event => onProgress({ ...event, phase: `subagent_${event.phase}` }), [], false, [], false, 1, Math.min(12, MAX_STEPS));
          await onProgress({ phase: "subagent_completed", step: step + 1 });
        } else {
          result = await executeTool(repo, call, deliveredInstructions, mode, authorizedCommands, commitContext);
        }
        if (toolName === "git_commit_unit") commitContext.commits++;
        if (validationId) failedValidations.delete(validationId);

        toolExecutions++;
        rejectedCategories.clear();
        const afterCommand = beforeCommand ? await gitChangeFingerprint(repo) : null;
        if (new Set(["write_file", "edit_file", "move_file", "delete_file"]).has(toolName) ||
            (beforeCommand && afterCommand && afterCommand !== beforeCommand)) successfulMutations++;
        if (["write_file", "edit_file", "delete_file"].includes(toolName) && typeof args.path === "string") commitContext.touched.add(ownedPath(args.path));
        if (toolName === "move_file") for (const value of [args.from, args.to]) if (typeof value === "string") commitContext.touched.add(ownedPath(value));
      } catch (error) {
        if (error instanceof WorkerIncompleteError) throw error;
        outcome = error instanceof ToolRejected ? "rejected" : "error";
        if (validationId && outcome === "error") failedValidations.add(validationId);
        diagnostic = error?.telemetry ?? safeToolDiagnostic(error);
        result =
          `${error instanceof ToolRejected ? "TOOL_REJECTED" : "WORKER_INFRA_ERROR"} na ferramenta ` +
          `${call?.function?.name ?? "desconhecida"}: ` +
          `${String(error?.message ?? error)}` +
          (toolName === "run_command" && authorizedCommands.length
            ? ` Use run_authorized_command com ID autorizado: ${authorizedCommands.map(command => command.id).join(", ")}.`
            : "");
        if (outcome === "rejected") {
          const count = (rejectedCalls.get(callSignature) ?? 0) + 1;
          rejectedCalls.set(callSignature, count);
          if (count >= 2) {
            blockedCalls.add(callSignature);
            await onProgress({ phase: "strategy_blocked", step: step + 1, tool: toolName,
              reason: "mesma chamada recusada duas vezes; assinatura bloqueada neste job" });
            result += " Esta chamada foi bloqueada após rejeição repetida. Adapte os argumentos, use alternativa permitida ou descreva em NEEDS_SUPERVISOR o acesso adicional estritamente necessário.";
          }
          const category = JSON.stringify([toolName, diagnostic]);
          const categoryCount = (rejectedCategories.get(category) ?? 0) + 1;
          rejectedCategories.set(category, categoryCount);
          if (categoryCount === 3) result += " Três variantes da mesma falha foram recusadas. Mude de ferramenta/estratégia agora; se precisar de mais acesso, explique em NEEDS_SUPERVISOR.";
          if (categoryCount >= 4) {
            await onProgress({ phase: "strategy_blocked", step: step + 1, tool: toolName,
              reason: "quatro recusas da mesma classe, apesar de variantes de argumentos" });
          }
        }
      }
      await onProgress({ phase: "tool_result", step: step + 1, tool: toolName, resource, outcome, duration_ms: Date.now() - startedTool,
        diagnostic });

      messages.push({
        role: "tool",
        tool_name: call.function.name,
        content: compact(result),
      });
      if (outcome === "rejected" && (rejectedCategories.get(JSON.stringify([toolName, diagnostic])) ?? 0) >= 4) {
        throw new WorkerIncompleteError(`WORKER_INCOMPLETE: estratégia ${toolName} repetiu quatro recusas determinísticas da mesma classe (${diagnostic}). Requer alternativa legítima ou autorização específica do supervisor.`);
      }
    }
  }

  const missingPaths = await unchangedRequiredPaths();
  throw new WorkerIncompleteError(`WORKER_INCOMPLETE: limite de ${stepLimit} ciclos agentivos atingido; ${successfulMutations} mutação(ões) bem-sucedida(s), ${toolExecutions} ferramenta(s) executada(s); caminhos obrigatórios inalterados: ${missingPaths.join(", ") || "nenhum"}. A tarefa requer segmentação ou correção da estratégia de exploração.`);
}
