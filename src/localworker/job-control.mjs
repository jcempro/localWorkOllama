import { promises as fs } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { JOBS, ROOT, TERMINAL, alive, atomicJson, getState, jobDir, readJson, setState } from "./job-store.mjs";

const execFileAsync = promisify(execFile);
const LOCK_WAIT_MS_Q7B = 15_000;
const STOP_WAIT_MS_Q7B = 5_000;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

export async function withJobControl(id, action) {
  jobDir(id);
  await fs.mkdir(JOBS, { recursive: true });
  const file = path.join(JOBS, `.control-${id}.lock`);
  let handle;
  const deadline = Date.now() + LOCK_WAIT_MS_Q7B;
  while (!handle && Date.now() < deadline) {
    try { handle = await fs.open(file, "wx"); }
    catch (error) {
      if (error?.code !== "EEXIST") throw error;
      const current = await readJson(file).catch(() => null);
      const stat = await fs.stat(file).catch(() => null);
      if (stat && Date.now() - stat.mtimeMs > LOCK_WAIT_MS_Q7B && !alive(current?.pid)) {
        await fs.rm(file, { force: true });
      } else await sleep(100);
    }
  }
  if (!handle) throw new Error("Operação concorrente do job em andamento; tente novamente.");
  try {
    await handle.writeFile(JSON.stringify({ pid: process.pid, at: new Date().toISOString() }));
    return await action();
  } finally {
    await handle.close();
    await fs.rm(file, { force: true });
  }
}

async function clearActiveReference(id) {
  const lockFile = path.join(ROOT, "create.lock");
  let lock;
  const deadline = Date.now() + LOCK_WAIT_MS_Q7B;
  while (!lock && Date.now() < deadline) {
    try { lock = await fs.open(lockFile, "wx"); }
    catch (error) { if (error?.code !== "EEXIST") throw error; await sleep(100); }
  }
  if (!lock) throw new Error("Criação concorrente impediu limpar a referência ativa; limpeza parcial pendente.");
  try {
    const activeFile = path.join(ROOT, "active.json");
    const active = await readJson(activeFile).catch(() => null);
    if (active?.job_id === id) await fs.rm(activeFile, { force: true });
  } finally {
    await lock.close();
    await fs.rm(lockFile, { force: true });
  }
}

async function runnerIdentity(id, state) {
  const pid = state.pid;
  if (!alive(pid)) return false;
  if (process.platform !== "win32") {
    const args = await fs.readFile(`/proc/${pid}/cmdline`, "utf8").catch(() => "");
    return args.includes("worker-runner.mjs") && args.includes(id);
  }
  const script = `$p=Get-Process -Id ${pid} -ErrorAction Stop; [pscustomobject]@{path=$p.Path; started=$p.StartTime.ToUniversalTime().ToString('o')} | ConvertTo-Json -Compress`;
  const { stdout } = await execFileAsync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script],
    { windowsHide: true, timeout: 5000 });
  const identity = JSON.parse(stdout);
  const expected = path.resolve(process.execPath).toLowerCase();
  const started = Date.parse(state.started_at);
  const processStarted = Date.parse(identity.started);
  return path.resolve(identity.path ?? "").toLowerCase() === expected && Number.isFinite(started) &&
    Number.isFinite(processStarted) && processStarted <= started + 2000 && started - processStarted < 30_000;
}

async function terminateRunner(id, state) {
  const pid = state.pid;
  if (!alive(pid)) return true;
  if (!(await runnerIdentity(id, state))) throw new Error("PID, executável ou início não correspondem ao runner deste job; processo preservado.");
  if (process.platform === "win32") {
    try { await execFileAsync("taskkill.exe", ["/PID", String(pid), "/T", "/F"], { windowsHide: true, timeout: 5000 }); }
    catch (error) {
      if (state.phase === "tool_call") throw new Error(`Não foi possível confirmar o encerramento da árvore de processos desta ação: ${String(error?.message ?? error).slice(0, 180)}`);
      process.kill(pid);
    }
  } else process.kill(pid, "SIGTERM");
  const deadline = Date.now() + STOP_WAIT_MS_Q7B;
  while (Date.now() < deadline) {
    if (!alive(pid)) return true;
    await sleep(100);
  }
  return !alive(pid);
}

export async function cancelJob(id) {
  return withJobControl(id, async () => {
    const state = await getState(id);
    if (state.job_id !== id) throw new Error("Identidade do estado do job divergente.");
    if (TERMINAL.has(state.status)) return { job_id: id, status: state.status, confirmed: state.status === "CANCELLED" };
    if (!["QUEUED", "RUNNING"].includes(state.status)) throw new Error(`Estado ${state.status} não permite STOP.`);
    const delivery = await readJson(path.join(jobDir(id), "delivery.json"));
    if (delivery.status !== "PENDING") throw new Error(`Entrega ${delivery.status} já iniciada; interrupção não confirmável.`);
    const marker = path.join(jobDir(id), "cancel-request.json");
    await atomicJson(marker, { job_id: id, requested_at: new Date().toISOString() });
    try {
      if (state.status === "RUNNING" && state.pid && !(await terminateRunner(id, state))) {
        throw new Error("Runner permaneceu ativo após comando de interrupção.");
      }
      if (state.status === "RUNNING" && !state.pid) throw new Error("RUNNING sem PID: encerramento não confirmado.");
      const fresh = await getState(id);
      if (TERMINAL.has(fresh.status)) return { job_id: id, status: fresh.status, confirmed: fresh.status === "CANCELLED" };
      await setState(id, { ...fresh, status: "CANCELLED", phase: "cancelled", completed_at: new Date().toISOString(), heartbeat_at: new Date().toISOString() });
      await atomicJson(path.join(jobDir(id), "delivery.json"), { status: "SUPPRESSED_CANCELLED", reason: "STOP confirmado; nenhuma retomada deste job." });
      return { job_id: id, status: "CANCELLED", confirmed: true };
    } catch (error) {
      if (alive(state.pid)) await fs.rm(marker, { force: true });
      throw error;
    }
  });
}

async function safeJobDirectory(dir) {
  const stat = await fs.lstat(dir);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error("Job não é diretório regular.");
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    if (!entry.isFile() || entry.isSymbolicLink()) throw new Error(`Entrada não regular no job: ${entry.name}`);
  }
}

export async function deleteJob(id) {
  return withJobControl(id, async () => {
    const dir = jobDir(id);
    const deleting = path.join(JOBS, `.deleting-${id}`);
    const current = await fs.lstat(dir).catch(error => { if (error?.code === "ENOENT") return null; throw error; });
    const partial = await fs.lstat(deleting).catch(error => { if (error?.code === "ENOENT") return null; throw error; });
    if (current && partial) throw new Error("Limpeza parcial e diretório ativo coexistem; intervenção necessária.");
    if (current) {
      await safeJobDirectory(dir);
      const state = await getState(id);
      if (state.job_id !== id || !TERMINAL.has(state.status)) throw new Error("Job ativo ou estado divergente; exclusão recusada.");
      const delivery = await readJson(path.join(dir, "delivery.json"));
      if (delivery.status === "STARTED") throw new Error("Entrega ao chat em execução; aguarde confirmação antes de excluir.");
      const log = await fs.readFile(path.join(dir, "worker.log"), "utf8").catch(() => "");
      if (log.includes("backup=")) throw new Error("Este job removeu arquivo do repositório e possui backup recuperável; preserve o histórico até restaurar ou arquivar esse dado pessoal.");
      const request = await readJson(path.join(dir, "request.json"));
      const recovery = path.join(ROOT, "recovery");
      for (const entry of await fs.readdir(recovery).catch(error => error?.code === "ENOENT" ? [] : Promise.reject(error))) {
        if (!entry.endsWith(".bin.json")) continue;
        const metadata = await readJson(path.join(recovery, entry)).catch(() => null);
        if (metadata?.job_id === id) throw new Error("Backup recuperável associado ao job; exclusão bloqueada para evitar perda de dados.");
        if (!metadata?.job_id && metadata?.repo && request.repoPath && path.resolve(metadata.repo).toLowerCase() === path.resolve(request.repoPath).toLowerCase()) {
          throw new Error("Backup legado sem job_id no mesmo repositório; autoria ambígua. Exclusão bloqueada para evitar resíduo ou perda de dados.");
        }
      }
      await fs.rename(dir, deleting);
    }
    if (partial || current) {
      await safeJobDirectory(deleting);
      await fs.rm(deleting, { recursive: true });
    }
    await clearActiveReference(id);
    const historyFile = path.join(ROOT, "history-cleanup.json");
    const history = await readJson(historyFile).catch(() => null);
    if (history?.errors?.some(error => error.job_id === id)) {
      await atomicJson(historyFile, { ...history, errors: history.errors.filter(error => error.job_id !== id) });
    }
    return { job_id: id, status: current || partial ? "DELETED" : "ALREADY_ABSENT", confirmed: true };
  });
}
