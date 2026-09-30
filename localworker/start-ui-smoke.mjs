import { spawn } from "node:child_process";
import path from "node:path";
import os from "node:os";

const threadId = process.argv[2];
if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(threadId ?? "")) {
  throw new Error("Informe o thread_id do chat Codex de teste.");
}

const repoPath = process.env.TEST_REPO_PATH;
if (!repoPath || path.basename(path.resolve(repoPath)).toLowerCase() !== "jeancarloem.com.blog") {
  throw new Error("Defina TEST_REPO_PATH para a cópia de jeancarloem.com.blog usada apenas nos testes.");
}
const installed = process.env.LOCAL_WORKER_ROOT ?? path.join(os.homedir(), ".codex-local-worker");
const server = spawn(process.execPath, [path.join(installed, "server.mjs")], {
  cwd: installed,
  env: { ...process.env, LOCAL_CODEX_HOME: process.env.LOCAL_CODEX_HOME ?? process.env.CODEX_HOME ?? path.join(os.homedir(), ".codex") },
  stdio: ["pipe", "pipe", "pipe"],
  windowsHide: true,
});

let sequence = 0;
let buffer = "";
const pending = new Map();
server.stdout.on("data", chunk => {
  buffer += chunk;
  let end;
  while ((end = buffer.indexOf("\n")) >= 0) {
    const line = buffer.slice(0, end);
    buffer = buffer.slice(end + 1);
    if (!line.trim()) continue;
    const packet = JSON.parse(line);
    const done = pending.get(packet.id);
    if (done) { pending.delete(packet.id); done(packet); }
  }
});

function rpc(method, params) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    const timeout = setTimeout(() => {
      if (pending.delete(id)) reject(new Error(`MCP sem resposta: ${method}`));
    }, 15000);
    pending.set(id, packet => { clearTimeout(timeout); resolve(packet); });
    server.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
  });
}

try {
  const initialized = await rpc("initialize", {
    protocolVersion: "2025-11-25",
    capabilities: {},
    clientInfo: { name: "ui-smoke", version: "1" },
  });
  if (!initialized.result) throw new Error(JSON.stringify(initialized.error ?? initialized));
  server.stdin.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n");
  const response = await rpc("tools/call", {
    name: "local_analyze",
    arguments: {
      repoPath,
      thread_id: threadId,
      mode: "read-only",
      task: "Teste curto de retomada da UI. Execute apenas git_status uma vez e informe branch e presença de alterações em até três linhas. Não edite arquivos nem faça exploração adicional.",
    },
  });
  const result = JSON.parse(response.result?.content?.[0]?.text ?? "null");
  if (result?.status !== "RUNNING") throw new Error(JSON.stringify(response));
  process.stdout.write(JSON.stringify(result) + "\n");
} finally {
  server.kill();
}
