import { createServer } from "node:http";
import assert from "node:assert/strict";
import path from "node:path";

const repo = process.env.TEST_REPO_PATH;
if (!repo || path.basename(path.resolve(repo)).toLowerCase() !== "jeancarloem.com.blog") {
  throw new Error("Defina TEST_REPO_PATH para o blog autorizado.");
}
let calls = 0;
const fake = createServer(async (req, res) => {
  let body = "";
  for await (const chunk of req) body += chunk;
  const parsed = JSON.parse(body);
  calls++;
  if (calls >= 5) assert.ok(parsed.tools.every(tool => tool.function.name !== "list_dir" && tool.function.name !== "repo_tree"));
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({ message: { role: "assistant", content: "", tool_calls: [{ function: { name: "git_status", arguments: {} } }] } }));
});
await new Promise(resolve => fake.listen(0, "127.0.0.1", resolve));
process.env.OLLAMA_URL = `http://127.0.0.1:${fake.address().port}`;
process.env.LOCAL_MODEL = "fake-test-model";
process.env.LOCAL_WORKER_MAX_STEPS = "8";
try {
  const { runLocalAnalysis, WorkerIncompleteError } = await import("./worker-core.mjs");
  const events = [];
  await assert.rejects(runLocalAnalysis(repo, "Teste de orçamento sem alteração.", "write", async event => events.push(event), [], true),
    error => error instanceof WorkerIncompleteError && /0 mutação/.test(error.message));
  assert.equal(calls, 8);
  assert.equal(events.filter(event => event.phase === "write_budget_warning").length, 2);
  console.log(JSON.stringify({ status: "WORKER_INCOMPLETE", cycles: calls, budget_warnings: 2 }));
} finally { fake.close(); }
