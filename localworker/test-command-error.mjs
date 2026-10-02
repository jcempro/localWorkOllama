import assert from "node:assert/strict";
import { createServer } from "node:http";
import path from "node:path";

const repo = process.env.TEST_REPO_PATH;
if (!repo || path.basename(path.resolve(repo)).toLowerCase() !== "jeancarloem.com.blog") {
  throw new Error("Defina TEST_REPO_PATH para o blog autorizado.");
}
let calls = 0;
let scenario = "authorized";
const missing = `.localworker-missing-${Date.now()}.mjs`;
const events = [];
const ollama = createServer(async (req, res) => {
  let body = "";
  for await (const chunk of req) body += chunk;
  calls++;
  if (calls === 2) assert.match(body, scenario === "authorized" ? /ERRO_DE_TESTE_VISIVEL/ : /MODULE_NOT_FOUND/);
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({ message: calls === 1
    ? { role: "assistant", content: "", tool_calls: [scenario === "authorized"
      ? { function: { name: "run_authorized_command", arguments: { id: "failure-test" } } }
      : { function: { name: "run_command", arguments: { program: "node", args: ["--check", missing] } } }] }
    : calls === 3
      ? { role: "assistant", content: "", tool_calls: [{ function: { name: "git_status", arguments: {} } }] }
      : { role: "assistant", content: "RESULTADO: falha diagnosticada." } }));
});
await new Promise(resolve => ollama.listen(0, "127.0.0.1", resolve));
process.env.OLLAMA_URL = `http://127.0.0.1:${ollama.address().port}`;
process.env.LOCAL_MODEL = "fake-test-model";
try {
  const { runLocalAnalysis } = await import("./worker-core.mjs");
  const result = await runLocalAnalysis(repo, "Teste controlado da saída de falha de comando, sem editar arquivos.", "write",
    event => { events.push(event); }, [{ id: "failure-test", description: "Falha simulada", program: process.execPath,
      args: ["-e", "process.stderr.write('ERRO_DE_TESTE_VISIVEL'); process.exit(7)"] }], false);
  assert.match(result, /falha diagnosticada/);
  assert.equal(calls, 4);
  assert.ok(events.some(event => event.phase === "tool_result" && event.outcome === "error" && event.diagnostic.includes("falha 7")));
  scenario = "checked";
  calls = 0;
  const checked = await runLocalAnalysis(repo, "Teste de erro de comando limitado, sem editar arquivos.", "write", event => { events.push(event); }, [], false);
  assert.match(checked, /falha diagnosticada/);
  assert.equal(calls, 4);
  assert.ok(events.some(event => event.phase === "tool_result" && event.tool === "run_command" && event.outcome === "error"));
  console.log(JSON.stringify({ status: "command-errors-visible", scenarios: 2 }));
} finally { ollama.close(); }
