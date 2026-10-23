import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import * as z from "zod/v4";
import { promises as fs } from "node:fs";
import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { createJob, getState, jobDir, readJson, setState } from "./job-store.mjs";
import { assertTargetThread } from "./thread-check.mjs";
import { ensureMonitor, monitorUrl, monitorIndexUrl, monitorSnapshot, inventorySnapshot } from "./monitor.mjs";
import { reconcileJob } from "./watchdog.mjs";
import { cancelJob, deleteJob } from "./job-control.mjs";
import { authorizeMaintenanceS4W, MaintenancePolicyError } from "./delegation-policy.mjs";
import { captureContinuityU6C } from "./continuity.mjs";
import { issueReviewReceiptQ8S, recordReviewQ8S } from './supervisor-review.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(await fs.readFile(path.join(root, "config.json"), "utf8"));
const reply = value => ({ content: [{ type: "text", text: JSON.stringify(value) }] });
class RequestRejected extends Error {}
const errorReply = error => ({ isError: true, content: [{ type: "text", text: `${error instanceof RequestRejected ? "WORKER_REQUEST_REJECTED" : "WORKER_INFRA_ERROR"}: ${String(error?.message ?? error)}` }] });
const execFileAsync = promisify(execFile);

async function gitRoot(repo) {
  try {
    const { stdout } = await execFileAsync("git", ["-C", repo, "rev-parse", "--show-toplevel"], { windowsHide: true, timeout: 5000 });
    return await fs.realpath(stdout.trim());
  } catch { return repo; }
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
    required_read_paths: z.array(z.string().min(1)).max(32).default([]).describe("Arquivos cujo conteúdo deve ser lido antes da conclusão; Git não substitui essa prova"),
    provided_evidence: z.object({ source: z.string().trim().min(1).max(1024), content: z.string().trim().min(1).max(12000) }).optional().describe("Evidência verificada fornecida pelo supervisor, com origem rastreável; somente análise read-only, não dispensa requisitos explícitos"),
    required_command_ids: z.array(z.string().min(1)).max(32).default([]).describe("IDs autorizados cuja execução com código zero é requisito de conclusão"),
    command_sequence: z.array(z.string().min(1)).max(32).default([]).describe("Sequência determinística explícita: executa cada ID uma vez, sem inferência; falha interrompe sem retry de mutação"),
    commit_policy: z.enum(["worker", "supervisor"]).default("worker").describe("Responsável pelo commit da unidade: supervisor somente quando ele assumirá o commit imediato após revisar"),
    maintenance_supervision: z.object({
      version: z.literal(1), criticality: z.number().min(0).max(10), regime: z.enum(['junior','intern','exclusive']),
      uncertainty_resolved: z.boolean(), rationale: z.string().min(12).max(2000), evidence: z.string().min(12).max(2000),
      scope_paths: z.array(z.string().min(1)).min(1).max(32), scope_sha256: z.string().regex(/^[a-f0-9]{64}$/),
      approved_action: z.object({tool:z.enum(['write_file','edit_file','move_file','delete_file','run_authorized_command']),args:z.record(z.string(),z.unknown())}).strict().optional(),
    }).strict().optional().describe('Somente manutenção própria: avaliação EXCLUSIVA do supervisor; C>7/exclusivo não cria job. Estagiário exige aprovação exata e checkpoint. Hash pelo delegation-policy.mjs instalado.'),
    thread_id: z.string().regex(/^[0-9a-f]{8}-[0-9a-f-]{27}$/i).describe("ID da conversa Codex atual, não de outro chat nem do projeto"),
    authorized_commands: z.array(z.object({
      id: z.string().regex(/^[a-z0-9][a-z0-9_-]{0,63}$/i),
      description: z.string().min(1).max(240),
      program: z.string().min(1).refine(value => path.isAbsolute(value) && !/[\r\n]/.test(value), "program deve ser caminho absoluto de executável"),
      args: z.array(z.string()).max(40),
      mode: z.enum(["read-only", "write"]).default("write").describe("Efeitos autorizados deste comando; leitura exige garantia do supervisor sobre executável/script exato"),
      network: z.boolean().default(false).describe("Rede explicitamente autorizada para os destinos/efeitos deste comando exato; não concede rede livre"),
      repeatable: z.boolean().default(false).describe("Permite repetir comando após sucesso, por exemplo validação após nova edição; mutação fica false"),
      timeout_ms: z.number().int().min(1000).max(300000).optional(),
    })).max(32).default([]).describe("Comandos exatos pré-aprovados; em read-only somente comandos explicitamente de leitura, sem shell livre"),
  }),
}, async ({ repoPath, task, mode, expect_changes, required_change_paths, thread_id, authorized_commands, required_read_paths, required_command_ids, command_sequence, commit_policy, provided_evidence, maintenance_supervision }) => {
  try {
    if (expect_changes && mode !== "write") throw new RequestRejected("expect_changes exige mode=write");
    if (provided_evidence && mode !== "read-only") throw new RequestRejected("provided_evidence exige read-only; não comprova execução ou alteração");
    if (required_change_paths.length && (mode !== "write" || expect_changes === false)) throw new RequestRejected("required_change_paths exige mode=write e expect_changes");
    if (mode !== "write" && authorized_commands.some(c => c.mode !== "read-only")) throw new RequestRejected("Job read-only exige comandos explicitamente read-only");
    if (new Set(authorized_commands.map(command => command.id)).size !== authorized_commands.length) throw new RequestRejected("IDs de comandos autorizados duplicados");
    for (const values of [required_read_paths, required_command_ids, command_sequence]) if(new Set(values).size !== values.length) throw new RequestRejected("Contrato contém duplicações");
    if ([...required_command_ids, ...command_sequence].some(id => !authorized_commands.some(c => c.id === id))) throw new RequestRejected("Contrato referencia comando não autorizado");
    if (command_sequence.length && required_read_paths.length) throw new RequestRejected("Sequência determinística não lê arquivos pelo modelo; use os comandos autorizados para validação");
    if (!path.isAbsolute(repoPath)) throw new RequestRejected("repoPath deve ser absoluto");
    const repo = await fs.realpath(repoPath).catch(error => { if (error?.code === "ENOENT") throw new RequestRejected("repoPath não existe"); throw error; });
    if (!(await fs.stat(repo)).isDirectory()) throw new RequestRejected("repoPath não é diretório");
    for (const relative of [...required_change_paths, ...required_read_paths]) {
      const resolved = path.resolve(repo, relative);
      const inside = path.relative(repo, resolved);
      if (path.isAbsolute(relative) || !inside || inside === ".." || inside.startsWith(`..${path.sep}`) || path.isAbsolute(inside)) {
        throw new RequestRejected(`required_change_paths fora do repositório: ${relative}`);
      }
    }
    const intent = {repoPath:repo,task,mode,expect_changes:expect_changes ?? (mode==='write'),required_change_paths,thread_id,
      authorized_commands,required_read_paths,required_command_ids,command_sequence,commit_policy,provided_evidence,maintenance_supervision};
    try { await authorizeMaintenanceS4W(intent,config); }
    catch(error) { if(error instanceof MaintenancePolicyError) throw new RequestRejected(error.message); throw error; }
    try { assertTargetThread(thread_id, repo); }
    catch (error) {
      if (/^thread_id /.test(String(error?.message ?? ""))) throw new RequestRejected(error.message);
      throw error;
    }
    const monitor = await ensureMonitor();
    const codexHome = process.env.LOCAL_CODEX_HOME ?? process.env.CODEX_HOME ?? path.join(os.homedir(),".codex");
    const continuity = codexHome ? await captureContinuityU6C(intent,codexHome) :
      {schema:1,bootId:null,desktopInstance:null,reason:"CODEX_HOME_UNVERIFIABLE"};
    const created = await createJob({ ...intent, git_root: await gitRoot(repo), continuity });
    if (created.busy) return reply({ status: "WORKER_BUSY", job_id: created.job_id, monitor_url: monitorUrl(monitor, created.job_id), monitor_index_url: monitorIndexUrl(monitor) });
    const runnerDiagnostic = await fs.open(path.join(jobDir(created.job_id), "runner-stderr.log"), "a");
    const child = spawn(process.execPath, [path.join(root, "worker-runner.mjs"), created.job_id], {
      detached: true, stdio: ["ignore", "ignore", runnerDiagnostic.fd], windowsHide: true, cwd: root,
      env: { ...process.env, LOCAL_WORKER_ROOT: root },
    });
    child.on("spawn", () => { void runnerDiagnostic.close(); });
    child.on("error", async error => {
      await runnerDiagnostic.close().catch(() => {});
      try {
        const state = await getState(created.job_id);
        await fs.writeFile(path.join(jobDir(created.job_id), "error.txt"), `WORKER_INFRA_ERROR: spawn: ${error}\n`);
        await setState(created.job_id, { ...state, status: "FAILED", error_kind: "WORKER_INFRA_ERROR", error: String(error) });
      } catch {}
    });
    child.unref();
    return reply({ job_id: created.job_id, status: "RUNNING", monitor_url: monitorUrl(monitor, created.job_id), monitor_index_url: monitorIndexUrl(monitor) });
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
    return reply({ ...snapshot.state, delivery: snapshot.delivery.status, activity: snapshot.activity, progress: snapshot.progress, monitor_url: monitorUrl(monitor, job_id), monitor_index_url: monitorIndexUrl(monitor) });
  } catch (error) { return errorReply(error); }
});

server.registerTool("local_monitor", {
  description: "Obtém o endereço atual do painel de todos os jobs retidos, sem acionar modelo nem exigir job_id.",
  inputSchema: z.object({}),
}, async () => {
  try {
    const monitor = await ensureMonitor();
    const inventory = await inventorySnapshot({ limit: 1 });
    return reply({ monitor_index_url: monitorIndexUrl(monitor), jobs_retained: inventory.all_total });
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
    let reviewReturn={result,supervisor_final:final};
    if(['COMPLETED','FAILED'].includes(state.status)){
      try{reviewReturn=await issueReviewReceiptQ8S(job_id);}
      catch(error){reviewReturn.review={status:'UNAVAILABLE',error:String(error?.message??error).slice(0,240)};}
    }
    return reply({ job_id, status: state.status, error_kind: state.error_kind ?? null, delivery: delivery.status, ...reviewReturn });
  } catch (error) { return errorReply(error); }
});

server.registerTool('local_review', {
  description:'Supervisor: registra nota0–10 somente após receber e examinar retorno terminal. Não infere qualidade pelo status; exige recibo local_result e confirmação de revisão.',
  inputSchema:z.object({job_id:z.string(),receipt_id:z.string().regex(/^[a-f0-9]{64}$/),receipt_token:z.string().regex(/^[a-f0-9]{64}$/),
    expected_revision:z.number().int().min(0).max(32),review_complete:z.literal(true),
    reviewer_thread_id:z.string().uuid(),reviewer_repo_path:z.string().min(1),score:z.number().int().min(0).max(10),reason:z.string().trim().max(360).optional()}).strict(),
},async ({reviewer_repo_path,...input})=>{
  try{
    if(process.env.LOCAL_WORKER_JOB_ID)throw new RequestRejected('Q8S: ferramenta exclusiva do supervisor');
    if(!path.isAbsolute(reviewer_repo_path))throw new RequestRejected('Q8S: diretório do supervisor deve ser absoluto');
    assertTargetThread(input.reviewer_thread_id,reviewer_repo_path);
    return reply(await recordReviewQ8S(input));
  }catch(error){return errorReply(error);}
});

server.registerTool("local_cancel", {
  description: "Interrompe apenas o runner deste job, confirma seu encerramento e suprime a retomada deste job.",
  inputSchema: z.object({ job_id: z.string() }),
}, async ({ job_id }) => {
  try {
    return reply(await cancelJob(job_id));
  } catch (error) { return errorReply(error); }
});

server.registerTool("local_delete", {
  description: "Exclui integralmente os artefatos exclusivos de um job terminal; recusa job ativo e limpeza parcial insegura.",
  inputSchema: z.object({ job_id: z.string() }),
}, async ({ job_id }) => {
  try { return reply(await deleteJob(job_id)); }
  catch (error) { return errorReply(error); }
});

return server;
}
void serveStdio(createServer);
