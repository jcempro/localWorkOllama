import assert from "node:assert/strict";
import { createServer } from "node:http";
import path from "node:path";
import { pathToFileURL } from "node:url";

const repo = process.env.TEST_REPO_PATH;
if (!repo || path.basename(path.resolve(repo)).toLowerCase() !== "jeancarloem.com.blog") {
  throw new Error("Defina TEST_REPO_PATH para o blog autorizado.");
}
let calls = 0;
let scenario = "identical";
const events = [];
const ollama = createServer(async (req, res) => {
  let body = "";
  for await (const chunk of req) body += chunk;
  const request = JSON.parse(body);
  calls++;
  if (scenario === "identical" && calls === 3) {
    assert.ok(request.tools.some(tool => tool.function.name === "run_command"));
    assert.ok(request.tools.some(tool => tool.function.name === "git_status"));
  }
  const invalidProgram = scenario === "varied" ? ["powershell", "cmd", "python", "bash"][Math.min(calls - 1, 3)] : "powershell";
  const message = calls <= (scenario === "varied" ? 4 : 2)
    ? { role: "assistant", content: "", tool_calls: [{ function: { name: "run_command", arguments: { program: invalidProgram, args: ["-Command", "exit 0"] } } }] }
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
  const { runLocalAnalysis } = await import(process.env.TEST_CORE_PATH ? pathToFileURL(process.env.TEST_CORE_PATH).href : "./worker-core.mjs");
  const result = await runLocalAnalysis(repo, "Teste de bloqueio de comando repetido.", "write", event => events.push(event));
  assert.match(result, /alternativa legítima/);
  assert.equal(calls, 4);
  assert.equal(events.filter(event => event.phase === "strategy_blocked").length, 1);
  assert.equal(events.filter(event => event.phase === "tool_result" && event.outcome === "rejected").length, 2);
  scenario = "varied"; calls = 0; events.length = 0;
  await assert.rejects(runLocalAnalysis(repo, "Teste de variantes inválidas da mesma classe.", "write", event => events.push(event)),
    /quatro recusas determinísticas/);
  assert.equal(calls, 4);
  assert.ok(events.some(event => event.phase === "strategy_blocked"));
  console.log(JSON.stringify({ status: "rejected-loop-contained", scenarios: 2 }));
} finally { ollama.close(); }
