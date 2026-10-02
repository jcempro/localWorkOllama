import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import { randomUUID, createHash } from "node:crypto";
import path from "node:path";
import { pathToFileURL } from "node:url";

const target = process.env.TEST_INSTALLED_WORKER;
const repo = process.env.TEST_REPO_PATH;
if (!target || !repo || path.basename(path.resolve(repo)).toLowerCase() !== "jeancarloem.com.blog") {
  throw new Error("Informe TEST_INSTALLED_WORKER e o repositório de teste autorizado em TEST_REPO_PATH.");
}
const runtime = await fs.realpath(target);
const source = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(?=[A-Za-z]:)/, ""));
for (const file of ["job-control.mjs", "monitor.mjs", "monitor-page.mjs", "delivery.mjs", "worker-runner.mjs"]) {
  const [actual, expected] = await Promise.all([fs.readFile(path.join(runtime, file)), fs.readFile(path.join(source, file))]);
  const hash = value => createHash("sha256").update(value).digest("hex");
  assert.equal(hash(actual), hash(expected), `${file} instalado diverge da fonte`);
}
const store = await import(pathToFileURL(path.join(runtime, "job-store.mjs")));
const { ensureMonitor } = await import(pathToFileURL(path.join(runtime, "monitor.mjs")));
const id = randomUUID(), dir = store.jobDir(id);
await fs.mkdir(dir);
try {
  const at = new Date().toISOString();
  await store.atomicJson(path.join(dir, "state.json"), { job_id: id, status: "QUEUED", created_at: at, heartbeat_at: at });
  await store.atomicJson(path.join(dir, "delivery.json"), { status: "PENDING" });
  await store.atomicJson(path.join(dir, "request.json"), { repoPath: repo, task: "Teste isolado do controle instalado" });
  const monitor = await ensureMonitor();
  const url = `http://127.0.0.1:${monitor.port}/api/job/${id}?token=${monitor.token}`;
  const stop = await fetch(url.replace("?token=", "/cancel?token="), { method: "POST" });
  assert.equal(stop.status, 200);
  const stopped = await stop.json();
  assert.deepEqual([stopped.status, stopped.confirmed], ["CANCELLED", true]);
  assert.equal((await store.readJson(path.join(dir, "delivery.json"))).status, "SUPPRESSED_CANCELLED");
  const deleted = await fetch(url, { method: "DELETE" });
  assert.equal(deleted.status, 200);
  assert.equal((await deleted.json()).status, "DELETED");
  assert.equal(await fs.stat(dir).then(() => true).catch(() => false), false);
  console.log(JSON.stringify({ status: "ok", installed_port: monitor.port, stop_confirmed: true, deletion_confirmed: true }));
} finally {
  if (await fs.stat(dir).then(() => true).catch(() => false)) {
    const state = await store.getState(id).catch(() => null);
    if (state?.job_id === id && state.status !== "RUNNING") await fs.rm(dir, { recursive: true, force: true });
  }
}
