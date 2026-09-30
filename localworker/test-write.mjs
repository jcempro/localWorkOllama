import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";

const repo = process.env.TEST_REPO_PATH;
if (!repo || path.basename(path.resolve(repo)).toLowerCase() !== "jeancarloem.com.blog") {
  throw new Error("Defina TEST_REPO_PATH para a cópia de jeancarloem.com.blog usada apenas nos testes.");
}
const relative = `.localworker-acceptance-${randomUUID()}.mjs`;
const target = path.join(repo, relative);
async function gitStatus() {
  return new Promise((resolve, reject) => {
    const child = spawn("git", ["-C", repo, "status", "--porcelain=v1", "-uall"]);
    let output = "";
    child.stdout.on("data", chunk => output += chunk);
    child.on("error", reject);
    child.on("exit", code => code === 0 ? resolve(output) : reject(new Error(`git status ${code}`)));
  });
}
const baseline = await gitStatus();
assert.equal(baseline, "", "Checkout de teste deve iniciar limpo");
let calls = 0;
const ollama = createServer(async (req, res) => {
  let body = "";
  for await (const chunk of req) body += chunk;
  const parsed = JSON.parse(body);
  calls++;
  let message;
  if (calls === 1) {
    message = { role: "assistant", content: "", tool_calls: [
      { function: { name: "write_file", arguments: { path: relative, content: "export const value = 1;\n" } } },
      { function: { name: "edit_file", arguments: { path: relative, before: "value = 1", after: "value = 2" } } },
      { function: { name: "run_command", arguments: { program: "node", args: ["--check", relative] } } },
      { function: { name: "git_status", arguments: {} } },
    ] };
  } else {
    const tools = parsed.messages.filter(x => x.role === "tool").map(x => x.content);
    assert.equal(tools.length, 4);
    assert.ok(tools.every(x => !x.includes("WORKER_INFRA_ERROR")), tools.join("\n"));
    assert.match(tools[3], new RegExp(relative.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    message = { role: "assistant", content: "RESULTADO: arquivo temporário validado." };
  }
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({ message }));
});
await new Promise(resolve => ollama.listen(0, "127.0.0.1", resolve));
process.env.OLLAMA_URL = `http://127.0.0.1:${ollama.address().port}`;
process.env.LOCAL_MODEL = "fake-test-model";
try {
  const { runLocalAnalysis } = await import("./worker-core.mjs");
  const result = await runLocalAnalysis(repo, "Teste controlado de criar, editar, verificar sintaxe e consultar Git em arquivo único temporário.", "write");
  assert.match(result, /arquivo temporário validado/);
  assert.equal(await fs.readFile(target, "utf8"), "export const value = 2;\n");
  console.log(JSON.stringify({ status: "write-verified", calls, file: relative }));
} finally {
  const current = await fs.readFile(target, "utf8").catch(error => error?.code === "ENOENT" ? null : Promise.reject(error));
  if (current !== null) {
    assert.ok(["export const value = 1;\n", "export const value = 2;\n"].includes(current), "Conteúdo inesperado: não remover automaticamente");
    await fs.rm(target);
  }
  ollama.close();
  assert.equal(await gitStatus(), baseline, "Git deve retornar exatamente ao estado inicial");
}
