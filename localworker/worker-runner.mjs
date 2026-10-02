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

async function main() {
  const request = await readJson(path.join(dir, "request.json"));
  const initial = await withJobControl(id, async () => {
    const current = await getState(id);
    if (current.status !== "QUEUED") return null;
    const next = { ...current, status: "RUNNING", pid: process.pid, started_at: new Date().toISOString(), heartbeat_at: new Date().toISOString(), last_event_at: null, phase: "starting", step: 0, event_count: 0, completed_tools: 0, failed_tools: 0, prompt_tokens_observed: 0, output_tokens_observed: 0, generation_ms_observed: 0 };
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
          prompt_tokens_observed: state.prompt_tokens_observed + (event.phase === "ollama_response" ? Number(event.prompt_tokens) || 0 : 0),
          output_tokens_observed: state.output_tokens_observed + (event.phase === "ollama_response" ? Number(event.output_tokens) || 0 : 0),
          generation_ms_observed: state.generation_ms_observed + (event.phase === "ollama_response" ? Number(event.eval_duration_ms) || 0 : 0) };
        await setState(id, state);
      });
      await pendingHeartbeat;
    }, request.authorized_commands ?? [], request.expect_changes ?? (request.mode === "write"), request.required_change_paths ?? [], request.mode === "write");
    let gitEvidence;
    try {
      const { stdout } = await execFileAsync("git", ["-C", request.repoPath, "status", "--short", "--branch"], { windowsHide: true, maxBuffer: 2 * 1024 * 1024 });
      gitEvidence = stdout.trimEnd();
    } catch (error) {
      gitEvidence = `Indisponível: ${String(error?.message ?? error)}`;
    }
    const checkedAt = new Date().toISOString();
    await atomicText(path.join(dir, "git-status.txt"), `${checkedAt}\n${gitEvidence}\n`);
    clearInterval(heartbeat);
    await pendingHeartbeat;
    await atomicText(path.join(dir, "result.md"), `${result}\n\nESTADO GIT DETERMINÍSTICO (${checkedAt}; prevalece se houver divergência):\n${gitEvidence}\n`);
    if ((await getState(id)).status !== "CANCELLED") await setState(id, { ...state, status: "COMPLETED", phase: "completed", completed_at: new Date().toISOString(), heartbeat_at: new Date().toISOString() });
  } catch (error) {
    clearInterval(heartbeat);
    await pendingHeartbeat.catch(() => {});
    const kind = error instanceof WorkerIncompleteError ? "WORKER_INCOMPLETE" : "WORKER_INFRA_ERROR";
    const message = `${kind}: ${String(error?.stack ?? error)}`;
    await atomicText(path.join(dir, "error.txt"), message + "\n");
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
