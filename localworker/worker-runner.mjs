import { promises as fs } from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { runLocalAnalysis, WorkerIncompleteError } from "./worker-core.mjs";
import { getState, setState, jobDir, readJson, atomicText, recordLatency } from "./job-store.mjs";
import { deliver } from "./delivery.mjs";
import { withJobControl } from "./job-control.mjs";

const id = process.argv[2];
const dir = jobDir(id);
const started = Date.now();
const MAX_AUDIT_LOG_BYTES_K9P = 2 * 1024 * 1024;
const AUDIT_LOG_TAIL_BYTES_K9P = 1024 * 1024;
const execFileAsync = promisify(execFile);
let heartbeat;
let pendingHeartbeat = Promise.resolve();

async function appendAuditK9P(event, at) {
  const file = path.join(dir, "worker.log");
  await fs.appendFile(file, `${at} ${JSON.stringify(event)}\n`);
  const size = (await fs.stat(file)).size;
  if (size <= MAX_AUDIT_LOG_BYTES_K9P) return;
  const handle = await fs.open(file, "r");
  let tail;
  try {
    const buffer = Buffer.alloc(AUDIT_LOG_TAIL_BYTES_K9P);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, size - buffer.length);
    tail = buffer.subarray(0, bytesRead).toString("utf8");
  } finally { await handle.close(); }
  tail = tail.slice(tail.indexOf("\n") + 1);
  await atomicText(file, `${new Date().toISOString()} ${JSON.stringify({ phase: "log_compacted", reason: "Limite do log atingido; eventos recentes preservados.", prior_bytes: size })}\n${tail}`);
}

async function gitEvidenceK9P(repo) {
  let evidence;
  try {
    const { stdout } = await execFileAsync("git", ["-C", repo, "status", "--short", "--branch"], { windowsHide: true, timeout: 15_000, maxBuffer: 2 * 1024 * 1024 });
    evidence = stdout.trimEnd();
  } catch (error) { evidence = `Indisponível: ${String(error?.message ?? error)}`; }
  const at = new Date().toISOString();
  await atomicText(path.join(dir, "git-status.txt"), `${at}\n${evidence}\n`);
  return `ESTADO GIT DETERMINÍSTICO (${at}; prevalece se houver divergência):\n${evidence}\n`;
}

async function main() {
  const request = await readJson(path.join(dir, "request.json"));
  const initial = await withJobControl(id, async () => {
    const current = await getState(id);
    if (current.status !== "QUEUED") return null;
    const next = { ...current, status: "RUNNING", pid: process.pid, started_at: new Date().toISOString(), heartbeat_at: new Date().toISOString(), last_event_at: null, phase: "starting", step: 0, event_count: 0, completed_tools: 0, failed_tools: 0, prompt_tokens_observed: 0, output_tokens_observed: 0, generation_ms_observed: 0, context_compactions: 0, context_limit_tokens: null };
    await setState(id, next);
    return next;
  });
  if (!initial) return;
  process.env.LOCAL_WORKER_JOB_ID = id;
  let state = initial;
  heartbeat = setInterval(() => {
    pendingHeartbeat = pendingHeartbeat.then(async () => {
      try {
        const cpu = process.cpuUsage();
        state = { ...state, heartbeat_at: new Date().toISOString(), cpu_user_ms: Math.round(cpu.user / 1000), cpu_system_ms: Math.round(cpu.system / 1000), rss_bytes: process.memoryUsage().rss };
        await setState(id, state);
      }
      catch (error) {
        try { await fs.appendFile(path.join(dir, "worker.log"), `${new Date().toISOString()} heartbeat: ${error}\n`); }
        catch {}
      }
    });
  }, 30_000);
  try {
    const result = await runLocalAnalysis(request.repoPath, request.task, request.mode, async event => {
      const at = new Date().toISOString();
      await appendAuditK9P(event, at);
      pendingHeartbeat = pendingHeartbeat.then(async () => {
        state = { ...state, last_event_at: at, phase: event.phase, step: event.step ?? state.step,
          tool: event.tool ?? state.tool, resource: event.resource ?? state.resource,
          event_count: state.event_count + 1,
          completed_tools: state.completed_tools + Number(event.phase === "tool_result" && event.outcome === "ok"),
          failed_tools: state.failed_tools + Number(event.phase === "tool_result" && event.outcome !== "ok"),
          context_compactions: event.phase === "context_compacted" ? event.compaction_count : state.context_compactions,
          context_limit_tokens: event.phase === "context_compacted" ? event.context_limit_tokens : state.context_limit_tokens,
          prompt_tokens_observed: state.prompt_tokens_observed + (event.phase === "ollama_response" ? Number(event.prompt_tokens) || 0 : 0),
          output_tokens_observed: state.output_tokens_observed + (event.phase === "ollama_response" ? Number(event.output_tokens) || 0 : 0),
          generation_ms_observed: state.generation_ms_observed + (event.phase === "ollama_response" ? Number(event.eval_duration_ms) || 0 : 0) };
        await setState(id, state);
      });
      await pendingHeartbeat;
    }, request.authorized_commands ?? [], request.expect_changes ?? (request.mode === "write"), request.required_change_paths ?? [], request.mode === "write");
    const gitEvidence = await gitEvidenceK9P(request.repoPath);
    clearInterval(heartbeat);
    await pendingHeartbeat;
    await atomicText(path.join(dir, "result.md"), `${result}\n\n${gitEvidence}`);
    if ((await getState(id)).status !== "CANCELLED") await setState(id, { ...state, status: "COMPLETED", phase: "completed", completed_at: new Date().toISOString(), heartbeat_at: new Date().toISOString() });
  } catch (error) {
    clearInterval(heartbeat);
    await pendingHeartbeat.catch(() => {});
    const kind = error instanceof WorkerIncompleteError ? "WORKER_INCOMPLETE" : "WORKER_INFRA_ERROR";
    const message = `${kind}: ${String(error?.stack ?? error)}`;
    const evidence = await gitEvidenceK9P(request.repoPath).catch(error => `ESTADO GIT DETERMINÍSTICO indisponível: ${String(error?.message ?? error)}`);
    await atomicText(path.join(dir, "error.txt"), `${message}\n\n${evidence}\n`);
    if ((await getState(id)).status !== "CANCELLED") await setState(id, { ...state, status: "FAILED", phase: "failed", error_kind: kind, completed_at: new Date().toISOString() });
  }
  await recordLatency((Date.now() - started) / 1000);
  await deliver(id);
}

main().catch(async error => {
  try { await fs.appendFile(path.join(dir, "worker.log"), `${new Date().toISOString()} runner: ${error?.stack ?? error}\n`); }
  catch {}
  process.exitCode = 1;
});
