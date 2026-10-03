import { createHash } from "node:crypto";

const NO_PROGRESS_LIMIT_P6R = 4;
const TRANSIENT_RETRIES_P6R = 2;
const READ_TOOLS_P6R = new Set(["read_file", "file_info", "list_dir", "repo_tree", "search_text", "git_status", "git_diff", "context_recall"]);
const digest = value => createHash("sha256").update(String(value)).digest("hex");
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  return value;
}
export function failureClassP6R(error, rejected = false) {
  const text = String(error?.message ?? error);
  if (/EACCES|EPERM|permission|permissão|acesso negado/i.test(text)) return "permission";
  if (/ENOENT|not found|não encontrad|inexistente|cannot find|No module named/i.test(text)) return "precondition";
  if (/invalid|inválid|não permitido|requer|argument|desconhecid/i.test(text) || rejected) return "invalid_or_disallowed";
  if (/not supported|incompat|unsupported/i.test(text)) return "incompatible_tool";
  if (/EBUSY|locked|bloqueado por|lock file/i.test(text)) return "external_block";
  if (/ECONNRESET|ETIMEDOUT|EAI_AGAIN|ECONNREFUSED|temporarily unavailable|HTTP (429|502|503|504)/i.test(text)) return "transient";
  if (/ENOSPC|ENOMEM|OOM|out of memory/i.test(text)) return "infrastructure";
  return "deterministic";
}

// O estado não é inferido da prosa do modelo. Só mudanças verificadas ou evidência nova contam.
export class ProgressGuardP6R {
  constructor() { this.calls = new Map(); this.outputs = new Set(); this.stagnant = 0; this.sequence = []; }
  key(tool, args) { return JSON.stringify([tool, canonical(args)]); }
  before(tool, args, state) {
    const prior = this.calls.get(this.key(tool, args));
    const changed = state != null && prior?.state != null && state !== prior.state;
    if (!prior || changed) return null;
    const transientAllowed = prior.kind === "transient" && READ_TOOLS_P6R.has(tool) && prior.attempts <= TRANSIENT_RETRIES_P6R;
    if (prior.failed && !transientAllowed || !prior.failed && prior.repeats >= 2) {
      return `Estratégia bloqueada: ${tool}, classe ${prior.kind}; mesma ação e estado sem mudança verificável. Corrija argumentos/pré-condição, use ferramenta alternativa ou informe NEEDS_SUPERVISOR com acesso e motivo exatos.`;
    }
    return null;
  }
  record(tool, args, before, after, result, error = null, rejected = false, blocked = false) {
    const key = this.key(tool, args), prior = this.calls.get(key);
    const changed = before != null && after != null && before !== after;
    const failed = error != null;
    const kind = blocked ? prior?.kind ?? "no_progress" : failed ? failureClassP6R(error, rejected) : "success";
    const evidence = digest(`${tool}\0${String(result)}`);
    const newEvidence = !failed && !this.outputs.has(evidence);
    if (!failed) this.outputs.add(evidence);
    const progress = changed || newEvidence;
    this.stagnant = progress ? 0 : this.stagnant + 1;
    if (!blocked) this.calls.set(key, { state: after, failed, kind,
      attempts: prior && before === prior.state ? prior.attempts + 1 : 1,
      repeats: progress ? 0 : (prior?.repeats ?? 0) + 1 });
    this.sequence.push({ tool, action_hash: digest(key), result_hash: evidence, kind, blocked,
      state_before: before, state_after: after, progress });
    if (this.sequence.length > NO_PROGRESS_LIMIT_P6R + 2) this.sequence.shift();
    return { kind, progress, stagnant_actions: this.stagnant, stop: this.stagnant >= NO_PROGRESS_LIMIT_P6R,
      sequence: this.sequence.slice() };
  }
}
