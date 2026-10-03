import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { jobDir, atomicJson } from "./job-store.mjs";
import { monitorSnapshot } from "./monitor.mjs";

const repo = process.env.TEST_REPO_PATH;
if (!repo || path.basename(path.resolve(repo)).toLowerCase() !== "jeancarloem.com.blog") throw new Error("Use somente o repositório de teste autorizado");
const id = randomUUID();
const directory = jobDir(id);
const evidenceFiles = (await fs.readdir(repo, { withFileTypes: true })).filter(entry => entry.isFile()).map(entry => entry.name);
assert.ok(evidenceFiles.length >= 8);
await fs.mkdir(directory, { recursive: true });
let requests = 0;
let recalled = false;
const events = [];
const server = createServer(async (request, response) => {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  if (request.url === "/api/ps") { response.end('{"models":[]}'); return; }
  const payload = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  assert.equal(request.url, "/api/chat");
  assert.equal(payload.truncate, false);
  assert.equal(payload.shift, false);
  assert.ok(Number.isInteger(payload.options.num_ctx));
  assert.match(payload.messages[0].content, /worker local Qwen subordinado/);
  assert.match(payload.messages[1].content, /Teste de continuidade/);
  requests++;
  const checkpoint = payload.messages.find(message => String(message.content ?? "").includes("CHECKPOINT DE CONTEXTO"));
  let message;
  if (checkpoint && !recalled) {
    assert.ok(payload.tools.some(tool => tool.function.name === "context_recall"));
    message = { role: "assistant", content: "", tool_calls: [{ function: { name: "context_recall", arguments: { checkpoint_id: "c0001", entry_index: 0 } } }] };
    recalled = true;
  } else if (recalled && payload.messages.at(-1)?.role === "tool" && payload.messages.at(-1)?.tool_name === "context_recall") {
    assert.match(payload.messages.at(-1).content, /DECISÃO_INTEGRA/);
    message = { role: "assistant", content: "RESULTADO: continuidade preservada com reidratação exata." };
  } else {
    message = { role: "assistant", content: requests <= 2 ? "DECISÃO_INTEGRA ".repeat(1100) : "Prosseguindo com evidência recente.",
      tool_calls: [{ function: { name: "file_info", arguments: { path: evidenceFiles[requests - 1] } } }] };
  }
  response.setHeader("Content-Type", "application/json");
  response.end(JSON.stringify({ message, prompt_eval_count: 1000 + requests, eval_count: 20 }));
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
process.env.OLLAMA_URL = `http://127.0.0.1:${server.address().port}`;
process.env.LOCAL_MODEL = "fake-context-model";
process.env.LOCAL_WORKER_JOB_ID = id;
try {
  const { runLocalAnalysis } = await import("./worker-core.mjs");
  const answer = await runLocalAnalysis(repo, "Teste de continuidade de contexto em modo somente leitura.", "read-only", event => events.push(event));
  assert.match(answer, /reidratação exata/);
  assert.ok(recalled);
  assert.ok(events.some(event => event.phase === "context_compacted"));
  assert.ok(events.some(event => event.phase === "context_effect_observed"));
  const archive = JSON.parse(await fs.readFile(path.join(directory, "context", "c0001.json"), "utf8"));
  assert.ok(archive.entries.some(entry => String(entry.content ?? "").includes("DECISÃO_INTEGRA")));
  const compacted = events.find(event => event.phase === "context_compacted");
  const now = new Date().toISOString();
  await atomicJson(path.join(directory, "state.json"), { job_id: id, status: "COMPLETED", created_at: now,
    started_at: now, completed_at: now, context_compactions: compacted.compaction_count, context_limit_tokens: compacted.context_limit_tokens });
  await atomicJson(path.join(directory, "request.json"), { repoPath: repo, task: "Teste de continuidade" });
  await atomicJson(path.join(directory, "delivery.json"), { status: "QUEUED_TO_CHAT" });
  await fs.writeFile(path.join(directory, "worker.log"), events.map(event => `${now} ${JSON.stringify(event)}`).join("\n") + "\n");
  const snapshot = await monitorSnapshot(id);
  assert.equal(snapshot.metrics.context_compactions, 1);
  assert.equal(snapshot.metrics.context_tokens_active, compacted.context_limit_tokens);
  assert.ok(snapshot.events.some(event => event.phase === "context_compacted"));
  console.log(JSON.stringify({ integration: "ok", requests, archived_entries: archive.entries.length }));
} finally {
  server.close();
  await fs.rm(directory, { recursive: true, force: true });
  delete process.env.LOCAL_WORKER_JOB_ID;
}
