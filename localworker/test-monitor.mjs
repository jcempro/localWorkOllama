import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import { randomUUID } from "node:crypto";
import path from "node:path";
import vm from "node:vm";
import { jobDir } from "./job-store.mjs";
import { ensureMonitor, monitorUrl, monitorIndexUrl, monitorSnapshot, inventorySnapshot, classifyActivity } from "./monitor.mjs";

const repo = process.env.TEST_REPO_PATH;
const id = process.env.TEST_JOB_ID;
if (!repo || path.basename(path.resolve(repo)).toLowerCase() !== "jeancarloem.com.blog" || !id) {
  throw new Error("Defina TEST_REPO_PATH para o blog autorizado e TEST_JOB_ID para um job de teste existente.");
}
const monitor = await ensureMonitor();
const url = monitorUrl(monitor, id);
const html = await fetch(url);
assert.equal(html.status, 200);
const page = await html.text();
assert.match(page, /Fechar esta página não interrompe/);
const scriptStart = page.indexOf("<script>") + 8;
new vm.Script(page.slice(scriptStart, page.indexOf("</script>", scriptStart)));
const indexUrl = monitorIndexUrl(monitor);
const index = await fetch(indexUrl);
assert.equal(index.status, 200);
assert.match(await index.text(), /Todos os jobs/);
const inventoryResponse = await fetch(indexUrl.replace("/?", "/api/jobs?"));
assert.equal(inventoryResponse.status, 200);
const inventory = await inventoryResponse.json();
assert.ok(inventory.repositories.includes(path.resolve(repo)));
assert.ok(inventory.jobs.some(job => job.job_id === id));
assert.ok(inventory.jobs.every((job, i, jobs) => i === 0 || Date.parse(jobs[i - 1].created_at) >= Date.parse(job.created_at)));
const api = await fetch(url.replace(`/job/${id}`, `/api/job/${id}`));
assert.equal(api.status, 200);
const snapshot = await api.json();
assert.equal(snapshot.state.job_id, id);
assert.ok(snapshot.progress.max_steps > 0);
assert.ok(snapshot.metrics.output_tokens_observed >= 0);
assert.ok(snapshot.duration_ms >= 0);
const filtered = await fetch(indexUrl.replace("/?", `/api/jobs?repo=${encodeURIComponent(path.resolve(repo))}&sort=status&direction=asc&`));
assert.equal(filtered.status, 200);
assert.ok((await filtered.json()).jobs.every(job => job.repo === path.resolve(repo)));
assert.equal((await fetch(url.replace(/token=[^&]+/, "token=invalido"))).status, 403);
const corruptId = randomUUID();
const corruptDir = jobDir(corruptId);
await fs.mkdir(corruptDir);
try {
  await fs.writeFile(path.join(corruptDir, "state.json"), "{invalid json");
  await fs.writeFile(path.join(corruptDir, "request.json"), JSON.stringify({ repoPath: repo, task: "Teste de artefato ilegível" }));
  await fs.writeFile(path.join(corruptDir, "delivery.json"), JSON.stringify({ status: "PENDING" }));
  assert.ok((await inventorySnapshot({ limit: 100 })).jobs.some(job => job.job_id === corruptId && job.status === "CORRUPT"));
  assert.equal((await monitorSnapshot(corruptId)).state.status, "CORRUPT");
} finally {
  const root = path.dirname(corruptDir);
  const resolved = await fs.realpath(corruptDir).catch(() => null);
  if (resolved?.toLowerCase() === corruptDir.toLowerCase() && resolved.toLowerCase().startsWith((root + path.sep).toLowerCase())) {
    await fs.rm(corruptDir, { recursive: true, force: true });
  }
}
const nestedId = randomUUID();
const nestedDir = jobDir(nestedId);
await fs.mkdir(nestedDir);
try {
  const now = new Date().toISOString();
  await fs.writeFile(path.join(nestedDir, "state.json"), JSON.stringify({ job_id: nestedId, status: "COMPLETED", created_at: now, completed_at: now }));
  await fs.writeFile(path.join(nestedDir, "request.json"), JSON.stringify({ repoPath: path.join(repo, "scripts"), task: "Teste de agrupamento Git" }));
  await fs.writeFile(path.join(nestedDir, "delivery.json"), JSON.stringify({ status: "QUEUED_TO_CHAT" }));
  assert.ok((await inventorySnapshot({ limit: 100 })).jobs.some(job => job.job_id === nestedId && job.repo === path.resolve(repo)));
} finally {
  const root = path.dirname(nestedDir);
  const resolved = await fs.realpath(nestedDir).catch(() => null);
  if (resolved?.toLowerCase() === nestedDir.toLowerCase() && resolved.toLowerCase().startsWith((root + path.sep).toLowerCase())) {
    await fs.rm(nestedDir, { recursive: true, force: true });
  }
}
const now = new Date().toISOString();
const old = new Date(Date.now() - 240_000).toISOString();
const base = { job_id: randomUUID(), status: "RUNNING", pid: process.pid, heartbeat_at: now, created_at: now };
const noResource = { ollama_cpu_seconds: null, gpu_percent: null };
assert.equal(classifyActivity(base, [{ at: now, phase: "tool_result" }], noResource, {}).kind, "ACTIVE");
assert.equal(classifyActivity({ ...base, job_id: randomUUID() }, [{ at: now, phase: "resource_wait", ram_available_bytes: 1024, ram_reserve_bytes: 2048 }], noResource, {}).kind, "WAITING_RESOURCES");
assert.equal(classifyActivity({ ...base, job_id: randomUUID() }, [{ at: now, phase: "ollama_request" }], noResource, {}).kind, "WAITING_MODEL");
assert.equal(classifyActivity({ ...base, job_id: randomUUID() }, [{ at: old, phase: "ollama_request" }], noResource, {}).kind, "STALLED_SUSPECTED");
assert.equal(classifyActivity({ ...base, job_id: randomUUID(), heartbeat_at: old }, [], noResource, {}).kind, "STALLED");
assert.equal(classifyActivity({ ...base, job_id: randomUUID() }, [{ at: old, phase: "tool_result" }], { ollama_cpu_seconds: 5, gpu_percent: 90 }, {}).kind, "STALLED");
assert.equal(classifyActivity({ ...base, job_id: randomUUID(), pid: 2147483647 }, [], noResource, {}).kind, "ORPHANED");
assert.equal(classifyActivity({ ...base, job_id: randomUUID(), pid: 2147483647 }, [], noResource, { result: true }).kind, "TERMINAL_NOT_PROPAGATED");
console.log(JSON.stringify({ job_id: id, ui: "ok", inventory: inventory.all_total, api: "ok", unauthorized: 403,
  corrupt_visible: true, git_root_grouping: true, activity_classes: 7 }));
