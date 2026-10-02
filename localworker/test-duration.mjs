import assert from "node:assert/strict";
import { createServer } from "node:http";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";

const repo = process.env.TEST_REPO_PATH;
if (!repo || path.basename(path.resolve(repo)).toLowerCase() !== "jeancarloem.com.blog") {
  throw new Error("TEST_REPO_PATH deve apontar ao repositório de teste autorizado.");
}
const git = promisify(execFile);
const status = async () => (await git("git", ["-C", repo, "status", "--porcelain=v1", "-uall"])).stdout;
const before = await status();
let calls = 0;
const fake = createServer(async (request, response) => {
  for await (const _ of request) { /* consumir corpo */ }
  calls++;
  await new Promise(resolve => setTimeout(resolve, 150));
  if (response.destroyed) return;
  response.setHeader("Content-Type", "application/json");
  response.end(JSON.stringify({ message: calls === 1
    ? { role: "assistant", content: "", tool_calls: [{ function: { name: "git_status", arguments: {} } }] }
    : { role: "assistant", content: "RESULTADO: conclusão após inferência lenta." } }));
});
await new Promise(resolve => fake.listen(0, "127.0.0.1", resolve));
process.env.OLLAMA_URL = `http://127.0.0.1:${fake.address().port}`;
process.env.LOCAL_MODEL = "fake-test-model";
try {
  process.env.LOCAL_WORKER_TIMEOUT_MS = "0";
  const unlimited = await import("./worker-core.mjs?duration-unlimited");
  const result = await unlimited.runLocalAnalysis(repo, "Consulte Git e conclua após a resposta.", "read-only");
  assert.match(result, /conclusão após inferência lenta/);
  assert.equal(calls, 2);

  process.env.LOCAL_WORKER_TIMEOUT_MS = "50";
  const bounded = await import("./worker-core.mjs?duration-explicit");
  await assert.rejects(bounded.runLocalAnalysis(repo, "Teste de prazo explicitamente configurado.", "read-only"),
    /Ollama \/api\/chat falhou|timeout total/);
  assert.equal(await status(), before, "O Git do repositório de teste deve permanecer intacto.");
  console.log(JSON.stringify({ unlimited_ms: 300, explicit_limit_ms: 50, git_preserved: true }));
} finally {
  fake.closeAllConnections();
  await new Promise(resolve => fake.close(resolve));
}
