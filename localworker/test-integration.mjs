import { createServer } from "node:http";
import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";

const root = path.dirname(fileURLToPath(import.meta.url));
const execFileAsync = promisify(execFile);
const runtimeRoot = path.dirname(process.env.TEST_SERVER_PATH ?? path.join(root, "server.mjs"));
const repo = process.env.TEST_REPO_PATH;
if (!repo || path.basename(path.resolve(repo)).toLowerCase() !== "jeancarloem.com.blog") {
  throw new Error("Defina TEST_REPO_PATH para a cópia de jeancarloem.com.blog usada apenas nos testes.");
}
const forbidden = `.localworker-readonly-${randomUUID()}.txt`;
const thread = randomUUID();
const archivedThread = randomUUID();
const codexHome = path.join(root, "jobs", `test-codex-home-${randomUUID()}`);
await fs.mkdir(codexHome, { recursive: true });
const codexDb = new DatabaseSync(path.join(codexHome, "state_5.sqlite"));
codexDb.exec("CREATE TABLE threads (id TEXT PRIMARY KEY, archived INTEGER NOT NULL, cwd TEXT NOT NULL)");
const insertThread = codexDb.prepare("INSERT INTO threads (id, archived, cwd) VALUES (?, ?, ?)");
insertThread.run(thread, 0, repo);
insertThread.run(archivedThread, 1, repo);
codexDb.close();
const queueLog = path.join(root, "jobs", `test-queue-${randomUUID()}.jsonl`);
const baseline = await new Promise((resolve, reject) => {
  const git = spawn("git", ["-C", repo, "status", "--porcelain=v1", "-uall"]);
  let value = "";
  git.stdout.on("data", x => value += x);
  git.on("error", reject);
  git.on("exit", code => code === 0 ? resolve(value) : reject(new Error("git status falhou")));
});

let requests = 0;
const ollama = createServer(async (req, res) => {
  let body = "";
  for await (const chunk of req) body += chunk;
  assert.equal(req.url, "/api/chat");
  const parsed = JSON.parse(body);
  assert.equal(parsed.model, "fake-test-model");
  if (parsed.messages.some(x => x.role === "user" && String(x.content).includes("FORCAR_FALHA"))) {
    res.statusCode = 500;
    res.end("falha simulada de Ollama");
    return;
  }
  requests++;
  if (requests === 2) {
    const responses = parsed.messages.filter(x => x.role === "tool").map(x => String(x.content));
    assert.ok(responses.some(x => x.includes("Ferramenta recusada em modo read-only: write_file")));
  }
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({ message: requests === 1
    ? { role: "assistant", content: "", tool_calls: [
      { function: { name: "write_file", arguments: { path: forbidden, content: "nao deve existir\n" } } },
      { function: { name: "git_status", arguments: {} } },
    ] }
    : { role: "assistant", content: "RESULTADO: leitura concluída sem edição." } }));
});
await new Promise(resolve => ollama.listen(0, "127.0.0.1", resolve));
const port = ollama.address().port;
const env = { ...process.env, OLLAMA_URL: `http://127.0.0.1:${port}`, LOCAL_MODEL: "fake-test-model",
  LOCAL_OLLAMA_ATTEMPTS: "1",
  LOCAL_WORKER_MAINTENANCE_REPO: path.resolve(root, ".."),
  LOCAL_CODEX_CMD: path.join(root, "missing-stale-codex.exe"), CODEX_CLI_PATH: process.execPath,
  LOCAL_CODEX_PREARGS_JSON: JSON.stringify([path.join(root, "fake-codex.mjs")]),
  LOCAL_FAKE_QUEUE_LOG: queueLog, LOCAL_DISABLE_NOTIFY: "1", LOCAL_DISABLE_MCP_REPAIR: "1",
  LOCAL_WORKER_BRIDGE_SERVER: process.env.TEST_SERVER_PATH ?? path.join(root, "server.mjs") };
env.LOCAL_CODEX_HOME = codexHome;
const server = spawn(process.execPath, [process.env.TEST_SERVER_PATH ?? path.join(root, "server.mjs")], { env, stdio: ["pipe", "pipe", "pipe"] });
server.stderr.on("data", chunk => process.stderr.write(chunk));
let seq = 0, buffer = "";
const waiting = new Map();
server.stdout.on("data", chunk => {
  buffer += chunk;
  let index;
  while ((index = buffer.indexOf("\n")) >= 0) {
    const line = buffer.slice(0, index); buffer = buffer.slice(index + 1);
    if (!line.trim()) continue;
    const data = JSON.parse(line);
    const waiter = waiting.get(data.id);
    if (waiter) { waiting.delete(data.id); waiter(data); }
  }
});
function rpc(method, params) {
  return new Promise((resolve, reject) => {
    const id = ++seq;
    waiting.set(id, resolve);
    server.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
    setTimeout(() => { if (waiting.delete(id)) reject(new Error(`timeout ${method}`)); }, 15000).unref();
  });
}
try {
  await new Promise(resolve => setTimeout(resolve, 500));
  const init = await rpc("initialize", { protocolVersion: "2025-11-25", capabilities: {}, clientInfo: { name: "test", version: "1" } });
  if (!init.result) console.error(init);
  assert.ok(init.result);
  server.stdin.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n");
  const tools = await rpc("tools/list", {});
  assert.ok(tools.result.tools.some(x => x.name === "local_status"));
  assert.ok(tools.result.tools.some(x => x.name === "local_monitor"));
  const monitorTool = await rpc("tools/call", { name: "local_monitor", arguments: {} });
  const monitorIndexUrl = JSON.parse(monitorTool.result.content[0].text).monitor_index_url;
  assert.match(monitorIndexUrl, /\/\?token=/);
  assert.equal((await fetch(monitorIndexUrl)).status, 200);
  const selfUse = await rpc("tools/call", { name: "local_analyze", arguments: { repoPath: path.resolve(root, ".."), task: "Não executar", mode: "read-only", thread_id: thread } });
  assert.match(selfUse.result.content[0].text, /WORKER_REQUEST_REJECTED/);
  assert.match(selfUse.result.content[0].text, /Proibido usar localWorker/);
  const nestedSelfUse = await rpc("tools/call", { name: "local_analyze", arguments: { repoPath: root, task: "Não executar", mode: "read-only", thread_id: thread } });
  assert.match(nestedSelfUse.result.content[0].text, /Proibido usar localWorker/);
  const unsafeMode = await rpc("tools/call", { name: "local_analyze", arguments: { repoPath: repo, task: "Não executar", mode: "read-only", thread_id: thread,
    authorized_commands: [{ id: "git-status", description: "Status", program: process.execPath, args: ["--version"] }] } });
  assert.match(unsafeMode.result.content[0].text, /WORKER_REQUEST_REJECTED/);
  assert.match(unsafeMode.result.content[0].text, /authorized_commands exige mode=write/);
  const unsafePath = await rpc("tools/call", { name: "local_analyze", arguments: { repoPath: repo, task: "Não executar", mode: "write", expect_changes: true,
    required_change_paths: ["../fora-do-repo.txt"], thread_id: thread } });
  assert.match(unsafePath.result.content[0].text, /WORKER_REQUEST_REJECTED/);
  assert.match(unsafePath.result.content[0].text, /required_change_paths fora do repositório/);
  const rejected = await rpc("tools/call", { name: "local_analyze", arguments: { repoPath: repo, task: "Somente leia o status Git.", mode: "read-only", thread_id: archivedThread } });
  assert.match(rejected.result.content[0].text, /WORKER_REQUEST_REJECTED/);
  assert.match(rejected.result.content[0].text, /conversa arquivada/);
  const encodedStart = Buffer.from(JSON.stringify({ repoPath: repo, task: "Somente leia o status Git.", mode: "read-only", thread_id: thread })).toString("base64");
  const bridgeStart = await execFileAsync(process.execPath, [process.env.TEST_BRIDGE_PATH ?? path.join(root, "mcp-call.mjs"), "local_analyze", encodedStart], { env, windowsHide: true, timeout: 120_000, maxBuffer: 1024 * 1024 });
  const receipt = JSON.parse(bridgeStart.stdout.trim());
  assert.equal(receipt.status, "RUNNING");
  assert.equal(receipt.monitor_index_url, monitorIndexUrl);
  const id = receipt.job_id;
  const deliveryFile = path.join(runtimeRoot, "jobs", id, "delivery.json");
  const terminal = await new Promise((resolve, reject) => {
    const deadline = Date.now() + 30000;
    const timer = setInterval(async () => {
      if (Date.now() > deadline) { clearInterval(timer); reject(new Error("job timeout")); return; }
      try {
        const value = JSON.parse(await fs.readFile(deliveryFile, "utf8"));
        if (value.status === "QUEUED_TO_CHAT") { clearInterval(timer); resolve(value); }
      } catch {}
    }, 100);
  });
  assert.equal(terminal.thread_id, thread);
  assert.match(terminal.acknowledgement, /Queued message fake/);
  assert.match(await fs.readFile(path.join(runtimeRoot, "jobs", id, "runner-stderr.log"), "utf8"), /filesystem OK/);
  const status = await rpc("tools/call", { name: "local_status", arguments: { job_id: id } });
  assert.equal(JSON.parse(status.result.content[0].text).status, "COMPLETED");
  const result = await rpc("tools/call", { name: "local_result", arguments: { job_id: id } });
  assert.match(JSON.parse(result.result.content[0].text).result, /leitura concluída/);
  assert.match(JSON.parse(result.result.content[0].text).result, /ESTADO GIT DETERMINÍSTICO/);
  const gitEvidence = await fs.readFile(path.join(runtimeRoot, "jobs", id, "git-status.txt"), "utf8");
  assert.match(gitEvidence, /## /);
  assert.equal(await fs.stat(path.join(repo, forbidden)).then(() => true, error => error?.code === "ENOENT" ? false : Promise.reject(error)), false);
  const watchdog = spawn(process.execPath, [path.join(runtimeRoot, "watchdog.mjs")], { env });
  await new Promise((resolve, reject) => watchdog.on("exit", code => code === 0 ? resolve() : reject(new Error(`watchdog ${code}`))));
  assert.equal(JSON.parse(await fs.readFile(deliveryFile, "utf8")).queued_at, terminal.queued_at);
  const failedStart = await rpc("tools/call", { name: "local_analyze", arguments: { repoPath: repo, task: "FORCAR_FALHA: teste de classificação de infraestrutura.", mode: "read-only", thread_id: thread } });
  const failedId = JSON.parse(failedStart.result.content[0].text).job_id;
  const failedFile = path.join(runtimeRoot, "jobs", failedId, "delivery.json");
  await new Promise((resolve, reject) => {
    const deadline = Date.now() + 30000;
    const timer = setInterval(async () => {
      if (Date.now() > deadline) { clearInterval(timer); reject(new Error("falha simulada sem estado terminal")); return; }
      try {
        const value = JSON.parse(await fs.readFile(failedFile, "utf8"));
        if (value.status === "QUEUED_TO_CHAT") { clearInterval(timer); resolve(); }
      } catch {}
    }, 100);
  });
  const failedStatus = await rpc("tools/call", { name: "local_status", arguments: { job_id: failedId } });
  assert.equal(JSON.parse(failedStatus.result.content[0].text).status, "FAILED");
  assert.equal(JSON.parse(await fs.readFile(failedFile, "utf8")).thread_id, thread);
  const orphanId = randomUUID();
  const orphanDir = path.join(runtimeRoot, "jobs", orphanId);
  await fs.mkdir(orphanDir);
  await fs.writeFile(path.join(orphanDir, "state.json"), JSON.stringify({ job_id: orphanId, status: "RUNNING", pid: 2147483647,
    created_at: new Date(Date.now() - 300_000).toISOString(), heartbeat_at: new Date(Date.now() - 300_000).toISOString() }));
  await fs.writeFile(path.join(orphanDir, "request.json"), JSON.stringify({ repoPath: repo, thread_id: thread, mode: "read-only", task: "Teste de órfão" }));
  await fs.writeFile(path.join(orphanDir, "delivery.json"), JSON.stringify({ status: "PENDING" }));
  const orphanCalls = await Promise.all(["local_status", "local_result"].map(name =>
    rpc("tools/call", { name, arguments: { job_id: orphanId } })));
  assert.ok(orphanCalls.every(call => JSON.parse(call.result.content[0].text).status === "FAILED"));
  const orphanError = await fs.readFile(path.join(orphanDir, "error.txt"), "utf8");
  assert.match(orphanError, /runner ausente/);
  assert.match(orphanError, /ESTADO GIT DETERMINÍSTICO/);
  const orphanAgain = await rpc("tools/call", { name: "local_status", arguments: { job_id: orphanId } });
  assert.equal(JSON.parse(orphanAgain.result.content[0].text).delivery, "QUEUED_TO_CHAT");
  const queued = (await fs.readFile(queueLog, "utf8")).trim().split("\n").map(line => JSON.parse(line)).filter(item => item.thread === thread);
  assert.equal(queued.length, 3);
  assert.ok(queued.every(item => item.thread === thread && item.repo === repo));
  assert.match(queued[1].message, /FAILED/);
  assert.match(queued[2].message, /FAILED/);
  assert.match(await fs.readFile(path.join(runtimeRoot, "jobs", failedId, "error.txt"), "utf8"), /WORKER_INFRA_ERROR/);
  const after = await new Promise((resolve, reject) => {
    const git = spawn("git", ["-C", repo, "status", "--porcelain=v1", "-uall"]);
    let value = "";
    git.stdout.on("data", x => value += x);
    git.on("error", reject);
    git.on("exit", code => code === 0 ? resolve(value) : reject(new Error("git status final falhou")));
  });
  assert.equal(after, baseline);
  console.log(JSON.stringify({ job_id: id, status: "COMPLETED", delivery: "QUEUED_TO_CHAT", failed_job: failedId, failure: "WORKER_INFRA_ERROR", queue_calls: queued.length, ollama_calls: requests, git_preserved: true }));
} finally {
  server.kill();
  ollama.close();
  const forbiddenPath = path.join(repo, forbidden);
  const content = await fs.readFile(forbiddenPath, "utf8").catch(error => error?.code === "ENOENT" ? null : Promise.reject(error));
  if (content === "nao deve existir\n") await fs.rm(forbiddenPath);
  await fs.rm(queueLog, { force: true });
  await fs.rm(codexHome, { recursive: true, force: true });
}
