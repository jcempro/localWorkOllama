import { promises as fs } from "node:fs";
import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { jobDir, getState, readJson, atomicJson, atomicText } from "./job-store.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(await fs.readFile(path.join(root, "config.json"), "utf8"));

export async function notify(title, body, kind = "info") {
  if (process.env.LOCAL_DISABLE_NOTIFY === "1") return;
  await new Promise(resolve => {
    const child = spawn("powershell.exe", ["-NoProfile", "-STA", "-ExecutionPolicy", "Bypass", "-File", path.join(root, "notify.ps1"), "-Title", title, "-Body", body.slice(0, 240), "-Kind", kind], { windowsHide: true, stdio: "ignore" });
    child.on("error", () => resolve());
    child.on("exit", () => resolve());
  });
}

function queueMessage(id, state) {
  const status = state.status === "COMPLETED" ? "concluiu" : `terminou com ${state.status}`;
  const dir = jobDir(id);
  return [
    `Retome a tarefa original neste mesmo chat. O localWorker do job ${id} ${status}.`,
    "Consulte local_result uma única vez, faça somente a revisão proporcional ao risco e conclua aqui.",
    "Compare afirmações sobre o estado Git com a seção ESTADO GIT DETERMINÍSTICO do resultado e corrija qualquer divergência.",
    `Se o transporte MCP estiver fechado, leia apenas os artefatos persistidos em ${dir} (state.json e result.md ou error.txt) para obter o resultado, sem reiniciar a análise.`,
    "Se houver WORKER_INFRA_ERROR, diagnostique a causa e corrija a integração ou o ambiente dentro do escopo autorizado; não refaça a tarefa delegada no supervisor.",
    "Não reinicie o job e não repita a exploração já delegada.",
  ].join(" ");
}

async function queueInChat(request, id, state) {
  const preArgs = process.env.LOCAL_CODEX_PREARGS_JSON ? JSON.parse(process.env.LOCAL_CODEX_PREARGS_JSON) : [];
  if (!Array.isArray(preArgs) || preArgs.some(value => typeof value !== "string")) throw new Error("LOCAL_CODEX_PREARGS_JSON inválido");
  const codexHome = process.env.LOCAL_CODEX_HOME ?? process.env.CODEX_HOME ?? path.join(os.homedir(), ".codex");
  return new Promise((resolve, reject) => {
    const child = spawn(process.env.LOCAL_CODEX_CMD ?? process.env.CODEX_CLI_PATH ?? config.codex_command ?? "codex.exe", [...preArgs,
      "queue", "-C", request.repoPath, "--thread", request.thread_id, "--message", queueMessage(id, state),
    ], { windowsHide: true, cwd: request.repoPath, env: { ...process.env, CODEX_HOME: codexHome }, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "", stderr = "";
    child.stdout.on("data", chunk => { stdout = (stdout + chunk).slice(-2000); });
    child.stderr.on("data", chunk => { stderr = (stderr + chunk).slice(-6000); });
    child.on("error", reject);
    child.on("exit", code => code === 0 ? resolve(stdout.trim()) : reject(new Error(`codex queue exit ${code}: ${stderr}`)));
  });
}

export async function deliver(id) {
  const dir = jobDir(id);
  const state = await getState(id);
  if (!new Set(["COMPLETED", "FAILED", "CANCELLED"]).has(state.status)) return { status: "NOT_TERMINAL" };
  const deliveryFile = path.join(dir, "delivery.json");
  const lockFile = path.join(dir, "delivery.lock");
  let lock;
  try { lock = await fs.open(lockFile, "wx"); }
  catch (error) { if (error?.code === "EEXIST") return { status: "LOCKED" }; throw error; }
  try {
    await lock.writeFile(JSON.stringify({ pid: process.pid }));
    const current = await readJson(deliveryFile);
    if (current.status !== "PENDING") return current;
    const request = await readJson(path.join(dir, "request.json"));
    if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(request.thread_id ?? "")) {
      await atomicText(path.join(dir, "delivery-error.txt"), "thread_id ausente ou inválido; retomada na UI indisponível.\n");
      await atomicJson(deliveryFile, { status: "BLOCKED_NO_THREAD", reason: "thread_id ausente ou inválido" });
      await notify("localWorker: retomada pendente", `Job ${id}: informe a conversa de origem.`, "error");
      return { status: "BLOCKED_NO_THREAD" };
    }
    await atomicJson(deliveryFile, { status: "STARTED", started_at: new Date().toISOString(), pid: process.pid, thread_id: request.thread_id });
    try {
      const acknowledgement = await queueInChat(request, id, state);
      await atomicJson(deliveryFile, { status: "QUEUED_TO_CHAT", queued_at: new Date().toISOString(), thread_id: request.thread_id, acknowledgement });
      await notify("localWorker concluído", `Job ${id}: retomada enviada ao chat de origem.`);
      return { status: "QUEUED_TO_CHAT" };
    } catch (error) {
      await atomicText(path.join(dir, "delivery-error.txt"), String(error?.stack ?? error) + "\n");
      await atomicJson(deliveryFile, { status: "AMBIGUOUS", failed_at: new Date().toISOString(), thread_id: request.thread_id, reason: "envio ao chat pode ter iniciado; sem repetição automática" });
      await notify("localWorker: falha na retomada", `Job ${id}: verifique o chat antes de repetir.`, "error");
      return { status: "AMBIGUOUS" };
    }
  } finally {
    await lock.close();
    await fs.rm(lockFile, { force: true });
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  deliver(process.argv[2]).catch(error => { console.error(error); process.exitCode = 1; });
}
