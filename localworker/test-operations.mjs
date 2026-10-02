import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { randomUUID, createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";

const root = path.dirname(fileURLToPath(import.meta.url));
const runtimeRoot = process.env.TEST_CORE_PATH ? path.dirname(process.env.TEST_CORE_PATH) : root;
const repo = process.env.TEST_REPO_PATH;
if (!repo || path.basename(path.resolve(repo)).toLowerCase() !== "jeancarloem.com.blog") {
  throw new Error("Defina TEST_REPO_PATH para a cópia de jeancarloem.com.blog usada apenas nos testes.");
}
const source = `.localworker-ops-${randomUUID()}.txt`;
const moved = `.localworker-ops-${randomUUID()}.txt`;
const content = "teste controlado de operações\n";
const hash = createHash("sha256").update(content).digest("hex");
const gitExe = execFileSync("where.exe", ["git.exe"], { encoding: "utf8" }).trim().split(/\r?\n/)[0];
assert.ok(path.isAbsolute(gitExe));

async function status() {
  return new Promise((resolve, reject) => {
    const child = spawn("git", ["-C", repo, "status", "--porcelain=v1", "-uall"], { windowsHide: true });
    let value = "";
    child.stdout.on("data", chunk => { value += chunk; });
    child.on("error", reject);
    child.on("exit", code => code === 0 ? resolve(value) : reject(new Error(`git status ${code}`)));
  });
}

const baseline = await status();
assert.equal(baseline, "", "Checkout de teste deve iniciar limpo");
let calls = 0;
let backup;
const ollama = createServer(async (req, res) => {
  let body = "";
  for await (const chunk of req) body += chunk;
  const parsed = JSON.parse(body);
  calls++;
  let message;
  if (calls === 1) {
    message = { role: "assistant", content: "", tool_calls: [
      { function: { name: "write_file", arguments: { path: source, content } } },
      { function: { name: "file_info", arguments: { path: source } } },
      { function: { name: "move_file", arguments: { from: source, to: moved, expected_sha256: hash } } },
      { function: { name: "delete_file", arguments: { path: moved, expected_sha256: hash } } },
      { function: { name: "run_authorized_command", arguments: { id: "git-status" } } },
      { function: { name: "run_authorized_command", arguments: { id: "nao-autorizado" } } },
    ] };
  } else {
    const outputs = parsed.messages.filter(item => item.role === "tool").map(item => String(item.content));
    assert.equal(outputs.length, 6);
    assert.match(outputs[1], new RegExp(hash));
    assert.match(outputs[2], /Arquivo movido/);
    assert.match(outputs[3], /backup recuperável/);
    assert.match(outputs[4], /stdout:/);
    assert.match(outputs[5], /TOOL_REJECTED/);
    assert.match(outputs[5], /Comando não autorizado/);
    backup = outputs[3].match(/backup=(.*?); sha256=/)?.[1];
    assert.ok(backup?.startsWith(path.join(runtimeRoot, "recovery") + path.sep));
    message = { role: "assistant", content: "RESULTADO: operações autorizadas concluídas." };
  }
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({ message }));
});
await new Promise(resolve => ollama.listen(0, "127.0.0.1", resolve));
process.env.OLLAMA_URL = `http://127.0.0.1:${ollama.address().port}`;
process.env.LOCAL_MODEL = "fake-test-model";
try {
  const { runLocalAnalysis } = await import(process.env.TEST_CORE_PATH ? pathToFileURL(process.env.TEST_CORE_PATH).href : "./worker-core.mjs");
  const result = await runLocalAnalysis(repo, "Teste controlado de operações em um arquivo temporário.", "write", async () => {}, [
    { id: "git-status", description: "Consultar status Git", program: gitExe, args: ["status", "--short"] },
  ]);
  assert.match(result, /operações autorizadas concluídas/);
  assert.equal(calls, 2);
  assert.equal(await fs.readFile(backup, "utf8"), content);
  assert.equal(await status(), baseline);
  console.log(JSON.stringify({ status: "operations-verified", calls, git: "clean" }));
} finally {
  for (const file of [source, moved]) {
    const full = path.join(repo, file);
    const current = await fs.readFile(full, "utf8").catch(error => error?.code === "ENOENT" ? null : Promise.reject(error));
    if (current !== null) {
      assert.equal(current, content, "Conteúdo inesperado: não remover automaticamente");
      await fs.rm(full);
    }
  }
  if (backup) {
    const recovered = await fs.readFile(backup, "utf8");
    assert.equal(recovered, content);
    await fs.rm(backup);
    await fs.rm(`${backup}.json`, { force: true });
  }
  ollama.close();
  assert.equal(await status(), baseline);
}
