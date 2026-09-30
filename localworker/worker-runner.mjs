import { promises as fs } from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { runLocalAnalysis } from "./worker-core.mjs";
import { getState, setState, jobDir, readJson, atomicText, recordLatency } from "./job-store.mjs";
import { deliver } from "./delivery.mjs";

const id = process.argv[2];
const dir = jobDir(id);
const started = Date.now();
const execFileAsync = promisify(execFile);
let heartbeat;
let pendingHeartbeat = Promise.resolve();

async function main() {
  const request = await readJson(path.join(dir, "request.json"));
  const initial = await getState(id);
  if (initial.status !== "QUEUED") return;
  const state = { ...initial, status: "RUNNING", pid: process.pid, started_at: new Date().toISOString(), heartbeat_at: new Date().toISOString() };
  await setState(id, state);
  heartbeat = setInterval(() => {
    pendingHeartbeat = pendingHeartbeat.then(async () => {
      try { await setState(id, { ...state, heartbeat_at: new Date().toISOString() }); }
      catch (error) {
        try { await fs.appendFile(path.join(dir, "worker.log"), `${new Date().toISOString()} heartbeat: ${error}\n`); }
        catch {}
      }
    });
  }, 30_000);
  try {
    const result = await runLocalAnalysis(request.repoPath, request.task, request.mode, async event => {
      await fs.appendFile(path.join(dir, "worker.log"), `${new Date().toISOString()} ${JSON.stringify(event)}\n`);
    }, request.authorized_commands ?? []);
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
    await setState(id, { ...state, status: "COMPLETED", completed_at: new Date().toISOString(), heartbeat_at: new Date().toISOString() });
  } catch (error) {
    clearInterval(heartbeat);
    await pendingHeartbeat;
    const message = `WORKER_INFRA_ERROR: ${String(error?.stack ?? error)}`;
    await atomicText(path.join(dir, "error.txt"), message + "\n");
    await setState(id, { ...state, status: "FAILED", error_kind: "WORKER_INFRA_ERROR", completed_at: new Date().toISOString() });
  }
  await recordLatency((Date.now() - started) / 1000);
  await deliver(id);
}

main().catch(async error => {
  try { await fs.appendFile(path.join(dir, "worker.log"), `${new Date().toISOString()} runner: ${error?.stack ?? error}\n`); }
  catch {}
  process.exitCode = 1;
});
