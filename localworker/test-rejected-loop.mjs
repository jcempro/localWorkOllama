import assert from "node:assert/strict";
import { createServer } from "node:http";
import path from "node:path";

const repo = process.env.TEST_REPO_PATH;
if (!repo || path.basename(path.resolve(repo)).toLowerCase() !== "jeancarloem.com.blog") {
  throw new Error("Defina TEST_REPO_PATH para o blog autorizado.");
}
let calls = 0;
const events = [];
const ollama = createServer(async (req, res) => {
  let body = "";
  for await (const chunk of req) body += chunk;
  const request = JSON.parse(body);
  calls++;
  if (calls === 3) {
    assert.ok(request.tools.some(tool => tool.function.name === "run_command"));
    assert.ok(request.tools.some(tool => tool.function.name === "git_status"));
  }
  const message = calls <= 2
    ? { role: "assistant", content: "", tool_calls: [{ function: { name: "run_command", arguments: { program: "powershell", args: ["-Command", "exit 0"] } } }] }
    : calls === 3
      ? { role: "assistant", content: "", tool_calls: [{ function: { name: "git_status", arguments: {} } }] }
      : { role: "assistant", content: "RESULTADO: alternativa legítima usada." };
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({ message }));
});
await new Promise(resolve => ollama.listen(0, "127.0.0.1", resolve));
process.env.OLLAMA_URL = `http://127.0.0.1:${ollama.address().port}`;
process.env.LOCAL_MODEL = "fake-test-model";
try {
  const { runLocalAnalysis } = await import("./worker-core.mjs");
  const result = await runLocalAnalysis(repo, "Teste de bloqueio de comando repetido.", "write", event => events.push(event));
  assert.match(result, /alternativa legítima/);
  assert.equal(calls, 4);
  assert.equal(events.filter(event => event.phase === "strategy_blocked").length, 1);
  assert.equal(events.filter(event => event.phase === "tool_result" && event.outcome === "rejected").length, 2);
  console.log(JSON.stringify({ status: "rejected-loop-contained", calls }));
} finally { ollama.close(); }
