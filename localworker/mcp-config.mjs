import { promises as fs, constants as fsConstants } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { codexCommand } from "./delivery.mjs";

const execFileAsync = promisify(execFile);
const SERVER_NAME_M7Q = "localworker";
const STARTUP_GRACE_MS_M7Q = 5000;
const SERVER_STARTUP_SEC_M7Q = 120;
const SERVER_TABLE_M7Q = /^\[mcp_servers\.localworker\][ \t]*\r?$/m;
const GRACE_KEY_M7Q = /^mcp_optional_startup_grace_ms[ \t]*=/m;
const root = path.dirname(fileURLToPath(import.meta.url));

async function runCodexM7Q(command, args, codexHome) {
  const { stdout } = await execFileAsync(command, args, {
    cwd: root, windowsHide: true, timeout: 30_000, maxBuffer: 1024 * 1024,
    env: { ...process.env, CODEX_HOME: codexHome },
  });
  return stdout;
}

async function checkRegistrationM7Q(command, codexHome, nodePath, serverPath) {
  try {
    const current = JSON.parse(await runCodexM7Q(command, ["mcp", "get", SERVER_NAME_M7Q, "--json"], codexHome));
    const samePath = (a, b) => typeof a === "string" && path.resolve(a).toLowerCase() === path.resolve(b).toLowerCase();
    return current.enabled === true && current.transport?.type === "stdio" &&
      samePath(current.transport.command, nodePath) &&
      current.transport.args?.length === 1 && samePath(current.transport.args[0], serverPath);
  } catch { return false; }
}

export async function ensureMcpRegistration({ configPath, nodePath = process.execPath, serverPath = path.join(root, "server.mjs"), command } = {}) {
  if (!configPath || !path.isAbsolute(configPath)) throw new Error("codex_config absoluto ausente");
  const codexHome = path.dirname(configPath);
  if (path.basename(configPath).toLowerCase() !== "config.toml") throw new Error("codex_config deve apontar a config.toml");
  for (const required of [nodePath, serverPath]) {
    if (!(await fs.stat(required).then(x => x.isFile()).catch(() => false))) throw new Error(`Executável ou servidor MCP ausente: ${required}`);
  }
  await fs.mkdir(codexHome, { recursive: true });
  const existing = await fs.readFile(configPath, "utf8").catch(error => error?.code === "ENOENT" ? "" : Promise.reject(error));
  const cli = command ?? await codexCommand();
  if (SERVER_TABLE_M7Q.test(existing)) {
    if (await checkRegistrationM7Q(cli, codexHome, nodePath, serverPath)) return { status: "OK" };
    throw new Error("Registro MCP localworker existente diverge da instalação; nenhuma configuração foi sobrescrita");
  }
  const backup = existing ? `${configPath}.localworker-backup-${new Date().toISOString().replace(/[^0-9]/g, "")}` : null;
  if (backup) await fs.copyFile(configPath, backup, fsConstants.COPYFILE_EXCL);
  await runCodexM7Q(cli, ["mcp", "add", SERVER_NAME_M7Q, "--", nodePath, serverPath], codexHome);
  if (!(await checkRegistrationM7Q(cli, codexHome, nodePath, serverPath))) throw new Error("Codex não confirmou o registro MCP após a gravação");
  const current = await fs.readFile(configPath, "utf8");
  const newline = current.includes("\r\n") ? "\r\n" : "\n";
  let next = current;
  if (!GRACE_KEY_M7Q.test(next)) next = `mcp_optional_startup_grace_ms = ${STARTUP_GRACE_MS_M7Q}${newline}${next}`;
  const table = SERVER_TABLE_M7Q.exec(next);
  if (!table) throw new Error("Registro MCP desapareceu durante a configuração");
  const after = table.index + table[0].length;
  const following = /^\[[^\r\n]+\]/m.exec(next.slice(after));
  const end = following ? after + following.index : next.length;
  const section = next.slice(table.index, end);
  if (!/^startup_timeout_sec[ \t]*=/m.test(section)) {
    next = `${next.slice(0, end).trimEnd()}${newline}startup_timeout_sec = ${SERVER_STARTUP_SEC_M7Q}${newline}${next.slice(end)}`;
  }
  if (next !== current) {
    const temporary = `${configPath}.${process.pid}.tmp`;
    try {
      await fs.writeFile(temporary, next, { flag: "wx" });
      await fs.rename(temporary, configPath);
    } finally { await fs.rm(temporary, { force: true }); }
  }
  if (!(await checkRegistrationM7Q(cli, codexHome, nodePath, serverPath))) throw new Error("Registro MCP falhou na validação final");
  return { status: "REPAIRED", backup };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const configPath = process.argv[2];
  const command = process.argv[3];
  const result = await ensureMcpRegistration({ configPath, command });
  console.log(JSON.stringify(result));
}
