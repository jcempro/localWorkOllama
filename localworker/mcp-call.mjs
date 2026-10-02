import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const PROTOCOL_VERSION_R4B = "2025-11-25";
const STARTUP_TIMEOUT_MS_R4B = 120_000;
const CALL_TIMEOUT_MS_R4B = 120_000;
const MAX_ARGUMENT_BYTES_R4B = 256 * 1024;
const ALLOWED_TOOLS_R4B = new Set(["local_analyze", "local_status", "local_result", "local_monitor"]);

export async function callLocalWorker({ name, args = {}, serverPath = path.join(root, "server.mjs"), env = process.env }) {
  if (!ALLOWED_TOOLS_R4B.has(name)) throw new Error(`Ferramenta não permitida: ${name}`);
  const child = spawn(process.execPath, [serverPath], { cwd: path.dirname(serverPath), env, windowsHide: true, stdio: ["pipe", "pipe", "pipe"] });
  let stderr = "", buffer = "", sequence = 0;
  const pending = new Map();
  child.stderr.on("data", chunk => { stderr = (stderr + chunk).slice(-4000); });
  child.stdout.on("data", chunk => {
    buffer += chunk;
    if (buffer.length > 4 * 1024 * 1024) { child.kill(); return; }
    let index;
    while ((index = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, index); buffer = buffer.slice(index + 1);
      if (!line.trim()) continue;
      let message;
      try { message = JSON.parse(line); }
      catch { continue; }
      const entry = pending.get(message.id);
      if (entry) { pending.delete(message.id); clearTimeout(entry.timer); entry.resolve(message); }
    }
  });
  const fail = error => {
    for (const [id, entry] of pending) {
      clearTimeout(entry.timer); entry.reject(error); pending.delete(id);
    }
  };
  child.on("error", fail);
  child.on("exit", code => fail(new Error(`MCP encerrado antes da resposta (${code}): ${stderr}`)));
  const rpc = (method, params, timeout) => new Promise((resolve, reject) => {
    const id = ++sequence;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`MCP sem resposta em ${method} após ${timeout} ms: ${stderr}`)); child.kill(); }, timeout);
    pending.set(id, { resolve, reject, timer });
    child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n", error => {
      if (error && pending.delete(id)) { clearTimeout(timer); reject(error); }
    });
  });
  try {
    const init = await rpc("initialize", { protocolVersion: PROTOCOL_VERSION_R4B, capabilities: {}, clientInfo: { name: "localworker-cli-bridge", version: "1" } }, STARTUP_TIMEOUT_MS_R4B);
    if (init.error || !init.result) throw new Error(`Inicialização MCP falhou: ${JSON.stringify(init.error ?? init)}`);
    child.stdin.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n");
    const reply = await rpc("tools/call", { name, arguments: args }, CALL_TIMEOUT_MS_R4B);
    if (reply.error) throw new Error(`Chamada MCP falhou: ${JSON.stringify(reply.error)}`);
    const text = reply.result?.content?.filter(item => item.type === "text").map(item => item.text).join("\n");
    if (!text) throw new Error("MCP não retornou conteúdo textual");
    if (reply.result.isError) throw new Error(text);
    return text;
  } finally {
    child.stdin.end();
    child.kill();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const name = process.argv[2];
    const encoded = process.argv[3] ?? "e30=";
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(encoded) || encoded.length > MAX_ARGUMENT_BYTES_R4B * 2) throw new Error("Argumentos Base64 inválidos ou excessivos");
    const raw = Buffer.from(encoded, "base64");
    if (raw.length > MAX_ARGUMENT_BYTES_R4B) throw new Error("Argumentos excedem 256 KiB");
    const args = JSON.parse(raw.toString("utf8"));
    if (!args || typeof args !== "object" || Array.isArray(args)) throw new Error("Argumentos devem ser objeto JSON");
    console.log(await callLocalWorker({ name, args, serverPath: process.env.LOCAL_WORKER_BRIDGE_SERVER ?? path.join(root, "server.mjs") }));
  } catch (error) {
    console.error(String(error?.message ?? error));
    process.exitCode = 1;
  }
}
