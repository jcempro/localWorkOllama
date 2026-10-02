import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { listJobs, jobDir, getState, setState, alive, readJson, atomicText, atomicJson, pruneJobHistory } from "./job-store.mjs";
import { deliver, notify } from "./delivery.mjs";
import { ensureMonitor } from "./monitor.mjs";
import { ensureMcpRegistration } from "./mcp-config.mjs";

const ORPHAN_GRACE_MS_W8K = 120_000;
const execFileAsync = promisify(execFile);

async function runnerDiagnosticW8K(dir) {
  const file = path.join(dir, "runner-stderr.log");
  try {
    const info = await fs.stat(file);
    const handle = await fs.open(file, "r");
    try {
      const size = Math.min(2048, info.size);
      const buffer = Buffer.alloc(size);
      const { bytesRead } = await handle.read(buffer, 0, size, info.size - size);
      return buffer.subarray(0, bytesRead).toString("utf8").trim();
    } finally { await handle.close(); }
  } catch { return ""; }
}

async function captureGitEvidence(dir) {
  const request = await readJson(path.join(dir, "request.json"));
  const checkedAt = new Date().toISOString();
  let status;
  try {
    const { stdout } = await execFileAsync("git", ["-C", request.repoPath, "status", "--short", "--branch"], {
      windowsHide: true, timeout: 10_000, maxBuffer: 2 * 1024 * 1024,
    });
    status = stdout.trimEnd();
  } catch (error) { status = `Indisponível: ${String(error?.message ?? error).slice(0, 300)}`; }
  await atomicText(path.join(dir, "git-status.txt"), `${checkedAt}\n${status}\n`);
  return `ESTADO GIT DETERMINÍSTICO (${checkedAt}; alterações parciais preservadas):\n${status}\n`;
}

export async function reconcileJob(id) {
    const now = Date.now();
    const dir = jobDir(id);
    const state = await getState(id);
    if (["QUEUED", "RUNNING"].includes(state.status)) {
      const last = Date.parse(state.heartbeat_at ?? state.created_at);
      if (state.status === "RUNNING" && !alive(state.pid) && await fs.stat(path.join(dir, "result.md")).then(() => true).catch(() => false)) {
        if (!(await fs.stat(path.join(dir, "git-status.txt")).then(() => true).catch(() => false))) {
          const git = await captureGitEvidence(dir);
          await fs.appendFile(path.join(dir, "result.md"), `\n${git}`);
        }
        await setState(id, { ...state, status: "COMPLETED", phase: "completed", completed_at: new Date().toISOString(), recovered_from: "result.md" });
      } else if (state.status === "RUNNING" && !alive(state.pid) && await fs.stat(path.join(dir, "error.txt")).then(() => true).catch(() => false)) {
        if (!(await fs.stat(path.join(dir, "git-status.txt")).then(() => true).catch(() => false))) {
          const git = await captureGitEvidence(dir);
          await fs.appendFile(path.join(dir, "error.txt"), `\n${git}`);
        }
        const error = await fs.readFile(path.join(dir, "error.txt"), "utf8");
        const kind = error.startsWith("WORKER_INCOMPLETE") ? "WORKER_INCOMPLETE" : "WORKER_INFRA_ERROR";
        await setState(id, { ...state, status: "FAILED", phase: "failed", error_kind: kind, completed_at: new Date().toISOString(), recovered_from: "error.txt" });
      } else if (now - last > ORPHAN_GRACE_MS_W8K && !alive(state.pid)) {
        const git = await captureGitEvidence(dir);
        const diagnostic = await runnerDiagnosticW8K(dir);
        await atomicText(path.join(dir, "error.txt"), `WORKER_INFRA_ERROR: runner ausente após heartbeat vencido; alterações parciais preservadas.\nÚltimo evento: ${state.last_event_at ?? "indisponível"}; heartbeat: ${state.heartbeat_at ?? "indisponível"}; PID: ${state.pid ?? "indisponível"}.\n${diagnostic ? `Diagnóstico stderr do runner (cauda):\n${diagnostic}\n` : "stderr do runner indisponível.\n"}\n${git}`);
        await setState(id, { ...state, status: "FAILED", phase: "failed", error_kind: "WORKER_INFRA_ERROR", completed_at: new Date().toISOString(), recovered_from: "runner-orphaned" });
      } else return { status: state.status, reconciled: false };
    }
    const delivery = await readJson(path.join(dir, "delivery.json"));
    if (delivery.status === "STARTED" && !alive(delivery.pid)) {
      await atomicText(path.join(dir, "delivery-error.txt"), "Envio ao chat iniciado; processo de entrega ausente. Estado ambíguo: sem retry automático.\n");
      await atomicJson(path.join(dir, "delivery.json"), { status: "AMBIGUOUS", reason: "entrega interrompida após início do envio ao chat" });
      await notify("localWorker: entrega ambígua", `Job ${id}: inspecione o chat antes de qualquer nova tentativa.`, "error");
      return { status: "AMBIGUOUS", reconciled: true };
    }
    if (delivery.status !== "PENDING") return { status: delivery.status, reconciled: false };
    const lock = path.join(dir, "delivery.lock");
    try {
      const held = await readJson(lock);
      if (alive(held.pid)) return { status: "LOCKED", reconciled: false };
      await fs.rm(lock, { force: true });
    } catch (error) {
      if (error?.code !== "ENOENT") {
        const stat = await fs.stat(lock).catch(() => null);
        if (!stat || now - stat.mtimeMs < ORPHAN_GRACE_MS_W8K) return { status: "LOCKED", reconciled: false };
        await fs.rm(lock, { force: true });
      }
    }
    return deliver(id);
}

async function main() {
  if (process.env.LOCAL_DISABLE_MCP_REPAIR !== "1") {
    try {
      const config = await readJson(path.join(path.dirname(fileURLToPath(import.meta.url)), "config.json"));
      if (config.codex_config) {
        const registration = await ensureMcpRegistration({ configPath: config.codex_config });
        if (registration.status === "REPAIRED") console.error("MCP localworker restaurado; novas sessões do Codex devem carregar as ferramentas.");
      }
    } catch (error) { console.error(`MCP localworker: ${error?.message ?? error}`); }
  }
  try { await ensureMonitor(); } catch (error) { console.error(`monitor: ${error?.message ?? error}`); }
  for (const id of await listJobs()) {
    try { await reconcileJob(id); }
    catch (error) { console.error(`watchdog ${id}: ${error?.stack ?? error}`); }
  }
  try { await pruneJobHistory(); }
  catch (error) { console.error(`history cleanup: ${error?.stack ?? error}`); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
