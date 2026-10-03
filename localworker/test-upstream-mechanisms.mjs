import { createServer } from "node:http";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";

const repo = process.env.TEST_REPO_PATH;
if (!repo || path.basename(path.resolve(repo)).toLowerCase() !== "jeancarloem.com.blog") {
  throw new Error("Defina TEST_REPO_PATH para a cópia de jeancarloem.com.blog usada apenas nos testes.");
}
const baseline = spawnSync("git", ["-C", repo, "status", "--porcelain=v1", "-uall"], { encoding: "utf8", windowsHide: true });
assert.equal(baseline.status, 0);
let calls = 0;
const tool = (name, args) => ({ function: { name, arguments: args } });
const ollama = createServer(async (request, response) => {
  let body = "";
  for await (const chunk of request) body += chunk;
  const parsed = JSON.parse(body);
  calls++;
  assert.match(parsed.messages[0].content, /ADAPTAÇÃO LOCAL EXCLUSIVA DA RAIZ ALVO/);
  assert.match(parsed.messages[0].content, /Adaptação operacional local/);
  assert.doesNotMatch(parsed.messages[0].content, /Regra local permanente — manutenção do localWorker/);
  const names = parsed.tools.map(item => item.function.name);
  const nested = calls === 3 || calls === 4;
  assert.equal(names.includes("delegate_readonly_subagent"), !nested);
  assert.equal(names.includes("write_file"), false);
  const message = calls === 1 ? { role: "assistant", content: "", tool_calls: [tool("git_status", {})] }
    : calls === 2 ? { role: "assistant", content: "", tool_calls: [tool("delegate_readonly_subagent", { task: "Leia o status Git e relate apenas sua evidência." })] }
    : calls === 3 ? { role: "assistant", content: "", tool_calls: [tool("git_status", {})] }
    : calls === 4 ? { role: "assistant", content: "RESULTADO: subagente verificou Git." }
    : { role: "assistant", content: "RESULTADO: supervisor local recebeu a evidência do subagente." };
  if (calls === 5) assert.match(JSON.stringify(parsed.messages), /subagente verificou Git/);
  response.setHeader("Content-Type", "application/json");
  response.end(JSON.stringify({ message }));
});
await new Promise(resolve => ollama.listen(0, "127.0.0.1", resolve));
process.env.OLLAMA_URL = `http://127.0.0.1:${ollama.address().port}`;
process.env.LOCAL_MODEL = "fake-test-model";
try {
  const { runLocalAnalysis } = await import(process.env.TEST_CORE_PATH ? pathToFileURL(process.env.TEST_CORE_PATH).href : "./worker-core.mjs");
  const result = await runLocalAnalysis(repo, "Teste read-only de delegação isolada sob AGENTS.md.");
  assert.match(result, /recebeu a evidência/);
  assert.equal(calls, 5);
  console.log(JSON.stringify({ status: "upstream-mechanisms-ok", calls }));
} finally {
  ollama.close();
  const after = spawnSync("git", ["-C", repo, "status", "--porcelain=v1", "-uall"], { encoding: "utf8", windowsHide: true });
  assert.equal(after.status, 0);
  assert.equal(after.stdout, baseline.stdout, "Teste não pode alterar o repositório externo");
}
