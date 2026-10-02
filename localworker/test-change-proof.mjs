import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createServer } from "node:http";
import { promises as fs } from "node:fs";
import { randomUUID } from "node:crypto";
import { promisify } from "node:util";
import path from "node:path";

const execFileAsync = promisify(execFile);
const repo = process.env.TEST_REPO_PATH;
if (!repo || path.basename(path.resolve(repo)).toLowerCase() !== "jeancarloem.com.blog") {
  throw new Error("Defina TEST_REPO_PATH para o blog autorizado.");
}
const gitExe = (await execFileAsync("where.exe", ["git.exe"])).stdout.trim().split(/\r?\n/)[0];
const baseline = (await execFileAsync(gitExe, ["-C", repo, "status", "--porcelain=v1", "-uall"])).stdout;
const marker = `localworker-proof-${randomUUID()}`;
const same = `.${marker}-same.txt`;
const other = `.${marker}-other.txt`;
const required = `.${marker}-required.txt`;
const changedContent = `${marker}-updated`;
let scenario = "command";
let calls = 0;
const events = [];
const ollama = createServer(async (req, res) => {
  for await (const _ of req) { /* consume request */ }
  calls++;
  let toolCalls = [];
  if (calls === 1) {
    if (scenario === "command") toolCalls = [{ function: { name: "run_authorized_command", arguments: { id: "git-check" } } }];
    if (scenario === "same") toolCalls = [
      { function: { name: "write_file", arguments: { path: same, content: marker } } },
      { function: { name: "git_status", arguments: {} } },
    ];
    if (scenario === "required") toolCalls = [{ function: { name: "write_file", arguments: { path: other, content: marker } } }];
    if (scenario === "untracked") toolCalls = [{ function: { name: "write_file", arguments: { path: same, content: changedContent } } }];
  }
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({ message: toolCalls.length
    ? { role: "assistant", content: "", tool_calls: toolCalls }
    : { role: "assistant", content: "RESULTADO: concluído." } }));
});
await new Promise(resolve => ollama.listen(0, "127.0.0.1", resolve));
process.env.OLLAMA_URL = `http://127.0.0.1:${ollama.address().port}`;
process.env.LOCAL_MODEL = "fake-test-model";
try {
  const { runLocalAnalysis } = await import("./worker-core.mjs");
  const command = [{ id: "git-check", description: "Consulta Git", program: gitExe, args: ["status", "--short", "--branch"] }];
  await assert.rejects(runLocalAnalysis(repo, "Teste: comando de leitura não é mutação.", "write", event => { events.push(event); }, command, true), /WORKER_INCOMPLETE/);
  assert.equal(calls, 3);

  await fs.writeFile(path.join(repo, same), marker, { flag: "wx" });
  scenario = "same"; calls = 0;
  await assert.rejects(runLocalAnalysis(repo, "Teste: escrita idêntica não é mutação.", "write", event => { events.push(event); }, [], true), /WORKER_INCOMPLETE/);
  assert.ok(events.some(event => event.phase === "tool_result" && event.tool === "write_file" && event.outcome === "rejected"));

  scenario = "required"; calls = 0;
  await assert.rejects(runLocalAnalysis(repo, "Teste: outro arquivo não substitui o obrigatório.", "write", event => { events.push(event); }, [], true, [required]), /WORKER_INCOMPLETE/);
  assert.ok(events.some(event => event.phase === "change_requirement" && event.missing_paths.includes(required)));
  scenario = "untracked"; calls = 0;
  const result = await runLocalAnalysis(repo, "Teste: conteúdo de arquivo novo já presente muda.", "write", event => { events.push(event); }, [], true, [same]);
  assert.match(result, /concluído/);
  assert.equal(await fs.readFile(path.join(repo, same), "utf8"), changedContent);
  console.log(JSON.stringify({ status: "change-proof-ok", scenarios: 4 }));
} finally {
  ollama.close();
  for (const relative of [same, other]) {
    const target = path.join(repo, relative);
    const content = await fs.readFile(target, "utf8").catch(error => error?.code === "ENOENT" ? null : Promise.reject(error));
    if (content === marker || content === changedContent) await fs.rm(target);
    else if (content !== null) throw new Error(`Arquivo de teste divergiu; preserve ${target}`);
  }
  const after = (await execFileAsync(gitExe, ["-C", repo, "status", "--porcelain=v1", "-uall"])).stdout;
  assert.equal(after, baseline, "Git do blog deve voltar ao estado inicial");
}
