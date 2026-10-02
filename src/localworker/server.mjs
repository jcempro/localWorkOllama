import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import * as z from "zod/v4";
import { promises as fs } from "node:fs";
import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createJob, getState, jobDir, readJson, setState } from "./job-store.mjs";
import { assertTargetThread } from "./thread-check.mjs";
import { ensureMonitor, monitorUrl, monitorSnapshot } from "./monitor.mjs";
import { reconcileJob } from "./watchdog.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(await fs.readFile(path.join(root, "config.json"), "utf8"));
const reply = value => ({ content: [{ type: "text", text: JSON.stringify(value) }] });
class RequestRejected extends Error {}
const errorReply = error => ({ isError: true, content: [{ type: "text", text: `${error instanceof RequestRejected ? "WORKER_REQUEST_REJECTED" : "WORKER_INFRA_ERROR"}: ${String(error?.message ?? error)}` }] });
const execFileAsync = promisify(execFile);

async function gitCommonDir(repo) {
  try {
    const { stdout } = await execFileAsync("git", ["-C", repo, "rev-parse", "--path-format=absolute", "--git-common-dir"], { windowsHide: true, timeout: 5000 });
    return (await fs.realpath(stdout.trim())).toLowerCase();
  } catch { return null; }
}

function createServer() {
const server = new McpServer({ name: "local-codex-worker", version: "3.0.0" });
server.registerTool("local_analyze", {
  description: "Inicia um job Qwen/Ollama persistente e retorna job_id e RUNNING. Consulte o ID da conversa Codex que faz ESTA chamada (não reutilize ID citado no prompt ou de outro chat) e informe-o em thread_id: a conclusão retomará esse chat na UI. O ID é validado contra o estado local do Codex antes de iniciar. read-only é o padrão; modo write exige autorização na tarefa. Em implementação solicitada, use expect_changes=true e, para arquivos conhecidos, required_change_paths.",
  inputSchema: z.object({
    repoPath: z.string().min(1).describe("Workspace absoluto"),
    task: z.string().min(1),
    mode: z.enum(["read-only", "write"]).default("read-only"),
    expect_changes: z.boolean().optional().describe("Em implementação/edição obrigatória, exige mutação bem-sucedida e mudança líquida antes de COMPLETED; padrão true em mode=write"),
    required_change_paths: z.array(z.string().min(1)).max(32).default([]).describe("Arquivos relativos que devem apresentar alteração líquida neste job; use quando a unidade tem alvos conhecidos"),
    thread_id: z.string().regex(/^[0-9a-f]{8}-[0-9a-f-]{27}$/i).describe("ID da conversa Codex atual, não de outro chat nem do projeto"),
    authorized_commands: z.array(z.object({
      id: z.string().regex(/^[a-z0-9][a-z0-9_-]{0,63}$/i),
      description: z.string().min(1).max(240),
      program: z.string().min(1).refine(value => path.isAbsolute(value) && !/[\r\n]/.test(value), "program deve ser caminho absoluto de executável"),
      args: z.array(z.string()).max(40),
      timeout_ms: z.number().int().min(1000).max(300000).optional(),
    })).max(32).default([]).describe("Comandos exatos pré-aprovados pelo supervisor, só em mode=write; sem shell livre"),
  }),
}, async ({ repoPath, task, mode, expect_changes, required_change_paths, thread_id, authorized_commands }) => {
  try {
    if (expect_changes && mode !== "write") throw new RequestRejected("expect_changes exige mode=write");
    if (required_change_paths.length && (mode !== "write" || expect_changes === false)) throw new RequestRejected("required_change_paths exige mode=write e expect_changes");
    if (mode !== "write" && authorized_commands.length) throw new RequestRejected("authorized_commands exige mode=write");
    if (new Set(authorized_commands.map(command => command.id)).size !== authorized_commands.length) throw new RequestRejected("IDs de comandos autorizados duplicados");
    if (!path.isAbsolute(repoPath)) throw new RequestRejected("repoPath deve ser absoluto");
    const repo = await fs.realpath(repoPath).catch(error => { if (error?.code === "ENOENT") throw new RequestRejected("repoPath não existe"); throw error; });
    if (!(await fs.stat(repo)).isDirectory()) throw new RequestRejected("repoPath não é diretório");
    for (const relative of required_change_paths) {
      const resolved = path.resolve(repo, relative);
      const inside = path.relative(repo, resolved);
      if (path.isAbsolute(relative) || !inside || inside === ".." || inside.startsWith(`..${path.sep}`) || path.isAbsolute(inside)) {
        throw new RequestRejected(`required_change_paths fora do repositório: ${relative}`);
      }
    }
    const maintenanceRepo = process.env.LOCAL_WORKER_MAINTENANCE_REPO ?? config.maintenance_repo;
    if (maintenanceRepo) {
      const maintenance = await fs.realpath(maintenanceRepo);
      const sameTree = repo.toLowerCase() === maintenance.toLowerCase() || repo.toLowerCase().startsWith(maintenance.toLowerCase() + path.sep.toLowerCase());
      const [repoGit, maintenanceGit] = sameTree ? [null, null] : await Promise.all([gitCommonDir(repo), gitCommonDir(maintenance)]);
      if (sameTree || (repoGit && repoGit === maintenanceGit)) {
        throw new RequestRejected("Proibido usar localWorker no repositório de sua própria manutenção; execute a manutenção externamente. Testes do Worker devem usar um repositório de teste distinto.");
      }
    }
    try { assertTargetThread(thread_id, repo); }
    catch (error) {
      if (/^thread_id /.test(String(error?.message ?? ""))) throw new RequestRejected(error.message);
      throw error;
    }
    const monitor = await ensureMonitor();
    const created = await createJob({ repoPath: repo, task, mode, expect_changes: expect_changes ?? (mode === "write"), required_change_paths, thread_id, authorized_commands });
    if (created.busy) return reply({ status: "WORKER_BUSY", job_id: created.job_id, monitor_url: monitorUrl(monitor, created.job_id) });
    const child = spawn(process.execPath, [path.join(root, "worker-runner.mjs"), created.job_id], {
      detached: true, stdio: "ignore", windowsHide: true, cwd: root,
      env: { ...process.env, LOCAL_WORKER_ROOT: root },
    });
    child.on("error", async error => {
      try {
        const state = await getState(created.job_id);
        await fs.writeFile(path.join(jobDir(created.job_id), "error.txt"), `WORKER_INFRA_ERROR: spawn: ${error}\n`);
        await setState(created.job_id, { ...state, status: "FAILED", error_kind: "WORKER_INFRA_ERROR", error: String(error) });
      } catch {}
    });
    child.unref();
    return reply({ job_id: created.job_id, status: "RUNNING", monitor_url: monitorUrl(monitor, created.job_id) });
  } catch (error) { return errorReply(error); }
});

server.registerTool("local_status", {
  description: "Lê estado persistido de um job sem acionar modelo.",
  inputSchema: z.object({ job_id: z.string() }),
}, async ({ job_id }) => {
  try {
    await reconcileJob(job_id);
    const snapshot = await monitorSnapshot(job_id);
    const monitor = await ensureMonitor();
    return reply({ ...snapshot.state, delivery: snapshot.delivery.status, activity: snapshot.activity, progress: snapshot.progress, monitor_url: monitorUrl(monitor, job_id) });
  } catch (error) { return errorReply(error); }
});

server.registerTool("local_result", {
  description: "Obtém resultado final somente de job terminal, sem polling.",
  inputSchema: z.object({ job_id: z.string() }),
}, async ({ job_id }) => {
  try {
    await reconcileJob(job_id);
    const state = await getState(job_id);
    if (["QUEUED", "RUNNING"].includes(state.status)) return reply({ job_id, status: state.status });
    const dir = jobDir(job_id);
    const delivery = await readJson(path.join(dir, "delivery.json"));
    const resultFile = state.status === "COMPLETED" ? "result.md" : "error.txt";
    const result = await fs.readFile(path.join(dir, resultFile), "utf8").catch(() => "");
    const final = await fs.readFile(path.join(dir, "supervisor-final.md"), "utf8").catch(() => "");
    return reply({ job_id, status: state.status, delivery: delivery.status, result, supervisor_final: final });
  } catch (error) { return errorReply(error); }
});

server.registerTool("local_cancel", {
  description: "Cancela execução local e registra estado terminal.",
  inputSchema: z.object({ job_id: z.string() }),
}, async ({ job_id }) => {
  try {
    const state = await getState(job_id);
    if (["COMPLETED", "FAILED", "CANCELLED"].includes(state.status)) return reply({ job_id, status: state.status });
    if (state.pid && Date.now() - Date.parse(state.heartbeat_at ?? state.created_at) < 120_000) {
      try { process.kill(state.pid); } catch {}
    }
    await setState(job_id, { ...state, status: "CANCELLED", completed_at: new Date().toISOString() });
    return reply({ job_id, status: "CANCELLED" });
  } catch (error) { return errorReply(error); }
});

return server;
}
void serveStdio(createServer);
