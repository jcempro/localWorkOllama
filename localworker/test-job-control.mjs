import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const source = path.dirname(fileURLToPath(import.meta.url));
const fixture = await fs.mkdtemp(path.join(os.tmpdir(), "localworker-control-"));
const canonical = await fs.realpath(fixture);
let child;
try {
  for (const file of ["job-store.mjs", "job-control.mjs", "delivery.mjs"]) await fs.copyFile(path.join(source, file), path.join(fixture, file));
  const store = await import(pathToFileURL(path.join(fixture, "job-store.mjs")));
  const { cancelJob, deleteJob } = await import(pathToFileURL(path.join(fixture, "job-control.mjs")));
  const { deliver } = await import(pathToFileURL(path.join(fixture, "delivery.mjs")));
  async function add(status, pid = null) {
    const id = randomUUID(), dir = store.jobDir(id), now = new Date().toISOString();
    await fs.mkdir(dir, { recursive: true });
    await store.setState(id, { job_id: id, status, pid, created_at: now, heartbeat_at: now });
    await store.atomicJson(path.join(dir, "delivery.json"), { status: "PENDING" });
    await store.atomicJson(path.join(dir, "request.json"), { task: "Teste", repoPath: process.env.TEST_REPO_PATH ?? null });
    return id;
  }
  const queued = await add("QUEUED");
  const neighbor = await add("COMPLETED");
  await store.atomicJson(path.join(fixture, "active.json"), { job_id: queued });
  const stopped = await cancelJob(queued);
  assert.deepEqual([stopped.status, stopped.confirmed], ["CANCELLED", true]);
  assert.equal((await store.readJson(path.join(store.jobDir(queued), "delivery.json"))).status, "SUPPRESSED_CANCELLED");
  assert.equal((await deliver(queued)).status, "SUPPRESSED_CANCELLED");
  assert.equal((await cancelJob(queued)).status, "CANCELLED");
  const active = await add("RUNNING");
  await assert.rejects(() => deleteJob(active), /Job ativo/);
  const deleted = await deleteJob(queued);
  assert.equal(deleted.status, "DELETED");
  assert.equal((await deleteJob(queued)).status, "ALREADY_ABSENT");
  assert.equal(await fs.stat(store.jobDir(queued)).then(() => true).catch(() => false), false);
  assert.equal(await fs.stat(store.jobDir(neighbor)).then(() => true).catch(() => false), true);
  assert.equal(await fs.stat(path.join(fixture, "active.json")).then(() => true).catch(() => false), false);
  const unsafe = await add("FAILED");
  await fs.mkdir(path.join(store.jobDir(unsafe), "nested"));
  await assert.rejects(() => deleteJob(unsafe), /Entrada não regular/);
  const backed = await add("COMPLETED");
  await fs.mkdir(path.join(fixture, "recovery"));
  await fs.writeFile(path.join(fixture, "recovery", "sample.bin.json"), JSON.stringify({ job_id: backed }));
  await assert.rejects(() => deleteJob(backed), /Backup recuperável/);
  const running = await add("QUEUED");
  const fakeRunner = path.join(fixture, "worker-runner.mjs");
  await fs.writeFile(fakeRunner, "setInterval(() => {}, 1000);\n");
  child = spawn(process.execPath, [fakeRunner, running], { windowsHide: true, stdio: "ignore" });
  await new Promise((resolve, reject) => { child.once("spawn", resolve); child.once("error", reject); });
  await store.setState(running, { ...(await store.getState(running)), status: "RUNNING", pid: child.pid, started_at: new Date().toISOString() });
  const interrupted = await cancelJob(running);
  assert.deepEqual([interrupted.status, interrupted.confirmed], ["CANCELLED", true]);
  assert.equal(store.alive(child.pid), false);
  console.log(JSON.stringify({ status: "ok", queued_cancel: true, running_cancel_confirmed: true,
    delivery_suppressed: true, delete_idempotent: true, sibling_preserved: true, unsafe_preserved: true,
    backup_preserved: true }));
} finally {
  if (child && !child.killed) child.kill();
  if ((await fs.realpath(fixture).catch(() => null)) === canonical) await fs.rm(fixture, { recursive: true, force: true });
}
