import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import { randomUUID } from "node:crypto";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repo = process.env.TEST_REPO_PATH;
if (!repo || path.basename(path.resolve(repo)).toLowerCase() !== "jeancarloem.com.blog") {
  throw new Error("TEST_REPO_PATH deve apontar ao repositório de teste autorizado.");
}
const source = path.join(path.dirname(fileURLToPath(import.meta.url)), "job-store.mjs");
const fixture = await fs.mkdtemp(path.join(os.tmpdir(), "localworker-history-"));
const safeFixture = await fs.realpath(fixture);
if (!safeFixture.toLowerCase().startsWith(path.resolve(os.tmpdir()).toLowerCase() + path.sep)) throw new Error("Fixture fora do temporário.");
try {
  process.env.LOCAL_WORKER_HISTORY_MAX_JOBS = "1";
  await fs.copyFile(source, path.join(fixture, "job-store.mjs"));
  const store = await import(pathToFileURL(path.join(fixture, "job-store.mjs")));
  const now = Date.now();
  const jobs = [];
  async function add(ageDays, status, delivery, nested = false) {
    const id = randomUUID();
    const dir = store.jobDir(id);
    await fs.mkdir(dir, { recursive: true });
    const completed = new Date(now - ageDays * 86400000).toISOString();
    await store.setState(id, { job_id: id, status, created_at: completed, completed_at: completed });
    await store.atomicJson(path.join(dir, "request.json"), { repoPath: repo, task: "Teste de retenção", mode: "read-only" });
    await store.atomicJson(path.join(dir, "delivery.json"), { status: delivery });
    if (nested) await fs.mkdir(path.join(dir, "unexpected-directory"));
    jobs.push(id);
    return id;
  }
  const expired = await add(100, "COMPLETED", "QUEUED_TO_CHAT");
  const older = await add(2, "COMPLETED", "QUEUED_TO_CHAT");
  const newest = await add(1, "COMPLETED", "QUEUED_TO_CHAT");
  const active = await add(100, "RUNNING", "PENDING");
  const ambiguous = await add(100, "FAILED", "AMBIGUOUS");
  const unsafe = await add(100, "COMPLETED", "QUEUED_TO_CHAT", true);
  await fs.writeFile(path.join(fixture, "history-cleanup.lock"), JSON.stringify({ pid: 2147483647,
    started_at: new Date(now - 20 * 60000).toISOString() }));
  const first = await store.pruneJobHistory({ force: true, now });
  assert.equal(first.removed_count, 2);
  assert.ok(first.errors.some(error => error.job_id === unsafe));
  assert.deepEqual(new Set(await store.listJobs()), new Set([newest, active, ambiguous, unsafe]));
  assert.equal(await fs.stat(store.jobDir(expired)).then(() => true).catch(() => false), false);
  assert.equal(await fs.stat(store.jobDir(older)).then(() => true).catch(() => false), false);
  const second = await store.pruneJobHistory({ force: true, now });
  assert.equal(second.removed_count, 0);
  const interrupted = await add(100, "COMPLETED", "QUEUED_TO_CHAT");
  await fs.rename(store.jobDir(interrupted), path.join(fixture, "jobs", `.retired-${interrupted}`));
  const recovered = await store.pruneJobHistory({ force: true, now });
  assert.equal(recovered.removed_count, 1);
  console.log(JSON.stringify({ status: "ok", removed: first.removed_count + recovered.removed_count,
    retained: (await store.listJobs()).length,
    active_preserved: true, ambiguous_preserved: true, nonregular_preserved: true, stale_lock_recovered: true,
    interrupted_cleanup_recovered: true }));
} finally {
  const current = await fs.realpath(fixture).catch(() => null);
  if (current === safeFixture) await fs.rm(fixture, { recursive: true, force: true });
}
