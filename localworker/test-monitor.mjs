import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { ensureMonitor, monitorUrl, monitorSnapshot, classifyActivity } from "./monitor.mjs";

const repo = process.env.TEST_REPO_PATH;
const id = process.env.TEST_JOB_ID;
if (!repo || path.basename(path.resolve(repo)).toLowerCase() !== "jeancarloem.com.blog" || !id) {
  throw new Error("Defina TEST_REPO_PATH para o blog autorizado e TEST_JOB_ID para um job de teste existente.");
}
const monitor = await ensureMonitor();
const url = monitorUrl(monitor, id);
const html = await fetch(url);
assert.equal(html.status, 200);
assert.match(await html.text(), /Fechá-la não interrompe/);
const api = await fetch(url.replace(`/job/${id}`, `/api/job/${id}`));
assert.equal(api.status, 200);
const snapshot = await api.json();
assert.equal(snapshot.state.job_id, id);
assert.ok(snapshot.progress.max_steps > 0);
assert.equal((await fetch(url.replace(/token=[^&]+/, "token=invalido"))).status, 403);
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
console.log(JSON.stringify({ job_id: id, ui: "ok", api: "ok", unauthorized: 403, activity_classes: 7 }));
