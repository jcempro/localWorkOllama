/** SW-HYBRID v1 — guarda declarativa; risco é decidido exclusivamente pelo supervisor.
 * Fonte: localWorkOllama, https://github.com/jcempro/localWorkOllama; licença ISC.
 * Contrato/CLI/limites: RCF SW-HYBRID e src/README.md. Não atribui notas nem autentica o caller.
 */
import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const POLICY_VERSION_S4W = 1;
const MAX_SCOPE_PATHS_S4W = 32;
const MAX_TEXT_S4W = 2000;
const ID_PATTERN_S4W = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const execFileS4W = promisify(execFile);
const foldS4W = (value: string) => process.platform === 'win32' ? value.toLowerCase() : value;

export class MaintenancePolicyError extends Error {}
const rejectS4W = (text: string): never => { throw new MaintenancePolicyError(text); };
/** Ordem de chaves estável; não aceita valores ambíguos/NaN em um vínculo de escopo. */
export function canonicalS4W(value: any): string {
  if (Array.isArray(value)) return '[' + value.map(canonicalS4W).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).filter(k => value[k] !== undefined).sort().map(k => JSON.stringify(k) + ':' + canonicalS4W(value[k])).join(',') + '}';
  if (value === undefined || typeof value === 'number' && !Number.isFinite(value)) rejectS4W('Valor inválido no vínculo de escopo');
  return JSON.stringify(value);
}
/** Mesma projeção source/content e trim de bordas do schema MCP, inclusive no contexto efetivo. */
export function normalizedEvidenceS4W(value: any): {source: string; content: string} | undefined {
  if (value === undefined) return undefined;
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      typeof value.source !== 'string' || typeof value.content !== 'string') {
    rejectS4W('provided_evidence inválida no vínculo de escopo');
  }
  return {source: value.source.trim(), content: value.content.trim()};
}
/** Projeção coincide com os defaults/normalização do MCP; avaliação/patente não entra no próprio hash. */
export function scopeHashS4W(request: any): string {
  const mode = request.mode ?? 'read-only';
  const material = { repoPath: foldS4W(path.resolve(request.repoPath)), task: request.task, thread_id: request.thread_id,
    mode, expect_changes: request.expect_changes ?? (mode === 'write'), commit_policy: request.commit_policy ?? 'worker',
    required_change_paths: request.required_change_paths ?? [], required_read_paths: request.required_read_paths ?? [],
    required_command_ids: request.required_command_ids ?? [], command_sequence: request.command_sequence ?? [],
    provided_evidence: normalizedEvidenceS4W(request.provided_evidence),
    ...(request.response_contract!==undefined?{response_contract:request.response_contract}:{}),
    assessment: request.maintenance_supervision ? Object.fromEntries(Object.entries(request.maintenance_supervision).filter(([k]) => k !== 'scope_sha256')) : undefined,
    authorized_commands: (request.authorized_commands ?? []).map((c: any) => ({ ...c, mode: c.mode ?? 'write', network: c.network ?? false, repeatable: c.repeatable ?? false })) };
  return createHash('sha256').update(canonicalS4W(material)).digest('hex');
}
/** Paths exatos de alteração, não diretórios/traversal/aliases. Guarda física existente continua. */
function relativeS4W(value: any): string {
  if (typeof value !== 'string' || !value.trim() || /[\0\r\n:*?]/.test(value) || path.isAbsolute(value) || value.endsWith('/') || value.endsWith('\\')) rejectS4W('Path de escopo inválido');
  const normalized = value.replaceAll('\\', '/');
  if (normalized.split('/').some(p => !p || p === '.' || p === '..')) rejectS4W('Path de escopo inválido');
  return foldS4W(normalized);
}
/** Valida decisão recebida; nunca estima criticidade ou infere faixa pela tarefa. */
export function validateSupervisionS4W(request: any, adopted: boolean): any {
  if (!adopted) rejectS4W('Manutenção própria proibida: política híbrida não adotada na instalação');
  const s = request.maintenance_supervision;
  if (!s || s.version !== POLICY_VERSION_S4W || typeof s.criticality !== 'number' || !Number.isFinite(s.criticality) || s.criticality < 0 || s.criticality > 10) rejectS4W('Avaliação exclusiva do supervisor ausente/inválida');
  if (s.uncertainty_resolved !== true) rejectS4W('Incerteza material não esclarecida: não delegar');
  if (s.criticality > 7 || s.regime === 'exclusive') rejectS4W('Supervisor exclusivo: delegação proibida');
  if (!['junior', 'intern'].includes(s.regime) || s.criticality <= 5 && s.regime !== 'junior') rejectS4W('Regime incompatível com os limites exatos de C');
  for (const field of ['rationale', 'evidence']) if (typeof s[field] !== 'string' || s[field].trim().length < 12 || s[field].length > MAX_TEXT_S4W) rejectS4W('Fundamentação/evidência do supervisor ausente ou excessiva');
  if (!Array.isArray(s.scope_paths) || !s.scope_paths.length || s.scope_paths.length > MAX_SCOPE_PATHS_S4W) rejectS4W('Escopo explícito de alteração ausente/excessivo');
  const paths = s.scope_paths.map(relativeS4W);
  if (new Set(paths).size !== paths.length || (request.required_change_paths ?? []).some((p: string) => !paths.includes(relativeS4W(p)))) rejectS4W('Alvos de alteração fora do escopo ou duplicados');
  if (s.scope_sha256 !== scopeHashS4W(request)) rejectS4W('Escopo mudou após avaliação: requer reavaliação do supervisor');
  if (s.regime === 'intern') {
    if (request.commit_policy !== 'supervisor') rejectS4W('Estagiário exige commit_policy=supervisor e checkpoint');
    const action = s.approved_action;
    if ((request.mode ?? 'read-only') === 'read-only') {
      if (action !== undefined) rejectS4W('Estagiário read-only não recebe aprovação de efeito');
    } else {
    if (!action || !['write_file', 'edit_file', 'move_file', 'delete_file', 'run_authorized_command'].includes(action.tool) || !action.args || typeof action.args !== 'object' || Array.isArray(action.args)) rejectS4W('Estagiário exige uma ação com efeito exata previamente aprovada');
    // Rejeita ação fora de alçada antes de inferência; segunda ação será checkpoint.
    if (!checkActionS4W({ ...s, scope_paths: paths }, action.tool, action.args, request.authorized_commands ?? [], 0)) rejectS4W('approved_action deve ter efeito; leitura não exige aprovação de mutação');
    }
  } else if (s.approved_action !== undefined) rejectS4W('approved_action é exclusiva do regime estagiário');
  return Object.freeze({ ...s, scope_paths: Object.freeze(paths), approved_action: s.approved_action ? JSON.parse(canonicalS4W(s.approved_action)) : undefined });
}
/** Checagem pré-efeito. Contador inclui tentativa parcialmente falha; não permite replay cego. */
export function checkActionS4W(s: any, tool: string, args: any, commands: any[], effectAttempts: number): boolean {
  if (!s) return false;
  if (tool === 'run_command' || tool === 'git_commit_unit' && s.regime === 'intern') rejectS4W('NEEDS_SUPERVISOR: efeito exige comando exato aprovado/commit do supervisor');
  const command = tool === 'run_authorized_command' ? commands.find(c => c.id === args.id) : null;
  if (tool === 'run_authorized_command' && !command) rejectS4W('Comando não autorizado');
  const effect = ['write_file', 'edit_file', 'move_file', 'delete_file', 'git_commit_unit'].includes(tool) || tool === 'run_authorized_command' && command.mode !== 'read-only';
  if (!effect) return false;
  const touched = tool === 'move_file' ? [args.from, args.to] : tool === 'git_commit_unit' ? args.paths : tool === 'run_authorized_command' ? [] : [args.path];
  if (!Array.isArray(touched) || touched.some(p => !s.scope_paths.includes(relativeS4W(p)))) rejectS4W('NEEDS_SUPERVISOR: alteração fora dos paths aprovados');
  if (s.regime === 'intern' && (effectAttempts > 0 || canonicalS4W({ tool, args }) !== canonicalS4W(s.approved_action))) rejectS4W('NEEDS_SUPERVISOR: checkpoint antes de outro efeito; ação exata/efeitos anteriores exigem revisão');
  return true;
}
/** Mantém identidade por marcador, path e Git comum; não transforma falha de descoberta em permissão. */
export async function isMaintenanceS4W(repo: string, config: any): Promise<boolean> {
  const id = process.env.LOCAL_WORKER_MAINTENANCE_ID ?? config.maintenance_id;
  if (id && !ID_PATTERN_S4W.test(id)) throw new Error('Identidade de manutenção inválida');
  if (id) {
    for (let current = repo;; current = path.dirname(current)) {
      const value = await fs.readFile(path.join(current, '.localworker-maintenance-id'), 'utf8').catch(e => { if (e.code === 'ENOENT') return ''; throw e; });
      if (value.trim() === id) return true;
      if (path.dirname(current) === current) break;
    }
  }
  const configured = process.env.LOCAL_WORKER_MAINTENANCE_REPO ?? config.maintenance_repo;
  if (!configured) return false;
  const source = await fs.realpath(configured).catch(e => { if (e.code === 'ENOENT' && id) return null; throw e; });
  if (!source) return false;
  if (foldS4W(repo) === foldS4W(source) || foldS4W(repo).startsWith(foldS4W(source + path.sep))) return true;
  const common = async (root: string) => { try { const { stdout } = await execFileS4W('git', ['-C', root, 'rev-parse', '--path-format=absolute', '--git-common-dir'], { windowsHide: true, timeout: 5000 }); return foldS4W(await fs.realpath(stdout.trim())); } catch { return null; } };
  const [a, b] = await Promise.all([common(repo), common(source)]);
  return Boolean(a && a === b);
}
export async function authorizeMaintenanceS4W(request: any, config: any): Promise<any> {
  const repo = await fs.realpath(request.repoPath);
  if (!await isMaintenanceS4W(repo, config)) {
    if (request.maintenance_supervision !== undefined) rejectS4W('maintenance_supervision exclusiva do próprio produto; não altera outros repositórios');
    return null;
  }
  if (!ID_PATTERN_S4W.test(process.env.LOCAL_WORKER_MAINTENANCE_ID ?? config.maintenance_id ?? '')) rejectS4W('Identidade de manutenção ausente: adoção recusada');
  return validateSupervisionS4W({ ...request, repoPath: repo }, config.maintenance_hybrid_version === POLICY_VERSION_S4W);
}
// CLI determinística: somente hash; dados via argv Base64, sem shell ou escrita/risco inferido.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv[2] === '--help') console.log('Uso: node delegation-policy.mjs --hash-base64 <JSON UTF-8 Base64>; stdout SHA-256; exit 0/2; nenhuma escrita/rede/inferência.');
    else {
      if (process.argv[2] !== '--hash-base64' || !process.argv[3] || process.argv[3].length > 100000) throw Error('Argumentos inválidos; use --help');
      console.log(scopeHashS4W(JSON.parse(Buffer.from(process.argv[3], 'base64').toString('utf8'))));
    }
  } catch (e) { console.error(String((e as Error).message)); process.exitCode = 2; }
}
