import { createServer } from "node:http";
import { spawn } from "node:child_process";
import path from "node:path";
import assert from "node:assert/strict";

const repo = process.env.TEST_REPO_PATH;
if (!repo || path.basename(path.resolve(repo)).toLowerCase() !== "jeancarloem.com.blog") {
  throw new Error("Defina TEST_REPO_PATH para a cópia de jeancarloem.com.blog usada apenas nos testes.");
}

async function status() {
  return new Promise((resolve, reject) => {
    const child = spawn("git", ["-C", repo, "status", "--porcelain=v1", "-uall"], { windowsHide: true });
    let output = "";
    child.stdout.on("data", chunk => { output += chunk; });
    child.on("error", reject);
    child.on("exit", code => code === 0 ? resolve(output) : reject(new Error(`git status ${code}`)));
  });
}

const baseline = await status();
assert.equal(baseline, "", "Checkout de teste deve iniciar limpo");
let calls = 0;
const events = [];
const ollama = createServer(async (req, res) => {
  for await (const _ of req) { /* consume request */ }
  calls++;
  if (calls === 1) {
    req.socket.destroy();
    return;
  }
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({ message: calls === 2
    ? { role: "assistant", content: "", tool_calls: [{ function: { name: "git_status", arguments: {} } }] }
    : { role: "assistant", content: "RESULTADO: transporte recuperado e Git consultado." } }));
});
await new Promise(resolve => ollama.listen(0, "127.0.0.1", resolve));
process.env.OLLAMA_URL = `http://127.0.0.1:${ollama.address().port}`;
process.env.LOCAL_MODEL = "fake-test-model";
try {
  const { runLocalAnalysis } = await import("./worker-core.mjs");
  const result = await runLocalAnalysis(repo, "Teste read-only do retry HTTP; consulte Git e conclua.", "read-only", async event => events.push(event));
  assert.match(result, /transporte recuperado/);
  assert.equal(calls, 3);
  assert.ok(events.some(x => x.phase === "ollama_error" && x.retryable));
  assert.ok(events.some(x => x.phase === "tool" && x.tool === "git_status"));
  assert.equal(await status(), baseline, "Git deve permanecer no estado inicial");
  console.log(JSON.stringify({ status: "transient-recovered", calls, git: "clean" }));
} finally {
  ollama.close();
}
