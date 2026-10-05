import { promises as fs } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const CONTEXT_TRIGGER_FRACTION_C7M = Number(process.env.LOCAL_WORKER_CONTEXT_TRIGGER_FRACTION ?? 0.68);
const CONTEXT_TARGET_FRACTION_C7M = 0.56;
const CONTEXT_MIN_SAVING_TOKENS_C7M = 512;
const CONTEXT_RECENT_MESSAGES_C7M = 8;
const CONTEXT_RECALL_CHARS_C7M = 12_000;
const CONTEXT_RAM_MARGIN_BYTES_C7M = Number(process.env.LOCAL_WORKER_CONTEXT_RAM_MARGIN_BYTES ?? 1024 ** 3);
const CONTEXT_VRAM_MARGIN_MIB_C7M = Number(process.env.LOCAL_WORKER_CONTEXT_VRAM_MARGIN_MIB ?? 512);

if (!Number.isFinite(CONTEXT_TRIGGER_FRACTION_C7M) || CONTEXT_TRIGGER_FRACTION_C7M <= CONTEXT_TARGET_FRACTION_C7M ||
    CONTEXT_TRIGGER_FRACTION_C7M > 0.8 || !Number.isSafeInteger(CONTEXT_RAM_MARGIN_BYTES_C7M) ||
    CONTEXT_RAM_MARGIN_BYTES_C7M < 0 || !Number.isSafeInteger(CONTEXT_VRAM_MARGIN_MIB_C7M) ||
    CONTEXT_VRAM_MARGIN_MIB_C7M < 0) throw new Error("Limiar preventivo de contexto/RAM/VRAM inválido");


export function estimateContextTokensC7M(messages, tools = []) {
  // Estimativa conservadora, independente do tokenizador do modelo.
  return Math.ceil(Buffer.byteLength(JSON.stringify({ messages, tools }), "utf8") / 2);
}

function toolLabel(message) {
  const call = message.tool_calls?.[0]?.function;
  if (!call) return message.tool_name ?? message.role;
  let location = "";
  try {
    const args = typeof call.arguments === "string" ? JSON.parse(call.arguments) : call.arguments;
    location = args?.path ?? args?.from ?? args?.id ?? "";
  } catch {}
  return `${call.name}${location ? ` ${String(location).slice(0, 100)}` : ""}`;
}

function overview(messages) {
  return messages.map((message, index) => {
    const content = String(message.content ?? "").replace(/\s+/g, " ").slice(0, 140);
    return `${index}: ${message.role} ${toolLabel(message)}${content ? ` — ${content}` : ""}`;
  }).join("\n");
}

function cutIndex(messages, recent = CONTEXT_RECENT_MESSAGES_C7M) {
  let cut = Math.max(2, messages.length - recent);
  while (cut > 2 && messages[cut]?.role === "tool") cut--;
  // Um retorno ainda não visto pelo modelo não é histórico descartável.
  // Preserve todo o lote da última chamada, inclusive código (não apenas Markdown).
  if (messages.at(-1)?.role === "tool") {
    let pending = messages.length - 1;
    while (pending > 2 && messages[pending]?.role === "tool") pending--;
    cut = Math.min(cut, pending);
  }
  return cut;
}

export class ContextOverflowC7M extends Error {}

function preservedContext(messages) {
  // Decisões textuais e instruções recebidas depois do início não podem virar só um índice.
  return messages.flatMap(message => {
    const text = String(message.content ?? "");
    if (message.role === "user" && text.startsWith("CHECKPOINT DE CONTEXTO")) {
      const marker = "\n\nESTADO E INSTRUÇÕES PRESERVADOS:\n";
      return text.includes(marker) ? [text.slice(text.indexOf(marker) + marker.length)] : [];
    }
    if (message.role === "assistant" && text.trim()) return [text];
    if (message.role === "user" && !text.startsWith("CHECKPOINT DE CONTEXTO")) return [text];
    if (["run_authorized_command", "git_commit_unit"].includes(message.tool_name)) return [text];
    if (message.tool_name === "read_file" && /\.md \[linhas \d+-\d+\/\d+\]/i.test(text)) return [text];
    return [...text.matchAll(/--- INSTRUÇÃO DO REPOSITÓRIO:[\s\S]*?--- FIM DA INSTRUÇÃO ---/g)].map(match => match[0]);
  }).join("\n\n");
}

function lowerContext(current, minimum, estimated) {
  for (const fraction of [0.75, 0.5]) {
    const candidate = Math.max(minimum, Math.floor(current * fraction / 1024) * 1024);
    if (candidate < current && estimated < candidate * CONTEXT_TRIGGER_FRACTION_C7M) return candidate;
  }
  return current;
}

export class ContextManagerC7M {
  constructor(directory, configuredTokens, minimumTokens = 8192) {
    if (!Number.isSafeInteger(configuredTokens) || configuredTokens < 4096 ||
        !Number.isSafeInteger(minimumTokens) || minimumTokens < 4096) {
      throw new Error("Janela de contexto configurada inválida");
    }
    this.directory = directory;
    this.contextTokens = configuredTokens;
    this.minimumTokens = Math.min(minimumTokens, configuredTokens);
    this.count = 0;
    this.checkpoints = [];
    this.lastPromptTokens = null;
    this.pendingEffect = null;
    this.lastUnavailable = null;
    this.checkpointUnavailable = false;
  }

  async observed(tokens, resources = null, emit = async () => {}) {
    if (Number.isSafeInteger(tokens) && tokens >= 0) this.lastPromptTokens = tokens;
    if (!this.pendingEffect) return;
    const prior = this.pendingEffect;
    this.pendingEffect = null;
    await emit({ phase: "context_effect_observed", reason: prior.reason,
      strategy: prior.strategy, compaction_count: prior.count,
      context_before_tokens: prior.before, context_after_tokens: prior.after,
      context_limit_tokens: this.contextTokens, prompt_tokens_observed: this.lastPromptTokens,
      ram_before_bytes: prior.ram, ram_after_bytes: resources?.ram ?? null,
      vram_before_mib: prior.vram, vram_after_mib: resources?.gpu?.freeMiB ?? null,
      summary: `Prompt real após ajuste: ${this.lastPromptTokens ?? "indisponível"} tokens. RAM/VRAM são medições compartilhadas, sem atribuição causal exclusiva.` });
  }

  async prepare(messages, tools, resources, emit = async () => {}) {
    const before = estimateContextTokensC7M(messages, tools);
    const ram = resources?.ram ?? null;
    const gpu = resources?.gpu ?? null;
    const ramPressure = ram && ram.ramAvailable < ram.ramReserve + CONTEXT_RAM_MARGIN_BYTES_C7M;
    const vramPressure = gpu && gpu.freeMiB < gpu.reserveMiB + CONTEXT_VRAM_MARGIN_MIB_C7M;
    const contextPressure = resources?.forceCompaction || before >= this.contextTokens * CONTEXT_TRIGGER_FRACTION_C7M ||
      (this.lastPromptTokens ?? 0) >= this.contextTokens * CONTEXT_TRIGGER_FRACTION_C7M;
    if (!ramPressure && !vramPressure && !contextPressure) return false;
    const reasons = [ramPressure && "RAM próxima da reserva", vramPressure && "VRAM próxima da reserva",
      contextPressure && "janela de contexto próxima do limite"].filter(Boolean);
    const reason = reasons.join("; ");
    let proposed = null;
    let after = before;
    let checkpoint = null;
    if (!this.checkpointUnavailable && this.directory) {
      for (const recent of resources?.forceCompaction ? [0] : [CONTEXT_RECENT_MESSAGES_C7M, 4, 2, 0]) {
      if (recent === 0 && messages.at(-1)?.tool_name === "context_recall") continue;
      const cut = cutIndex(messages, recent);
      if (cut <= 2) continue;
      const removed = messages.slice(2, cut);
      const id = `c${String(this.count + 1).padStart(4, "0")}`;
      const previous = this.checkpoints.map(item => item.id).join(", ") || "nenhum";
      const summary = `CHECKPOINT DE CONTEXTO ${id}. Objetivo original e normas permanecem integralmente nas duas primeiras mensagens. ` +
        `Histórico anterior persistido neste job; checkpoints anteriores: ${previous}. ` +
        `O resumo abaixo é índice, não substitui as evidências. Use context_recall com checkpoint_id e entry_index para reidratar qualquer decisão, saída ou argumento antes de depender dele. ` +
        `Estado atual de arquivos deve ser confirmado pelas ferramentas do repositório. Próximo passo: continue a tarefa original a partir das mensagens recentes, sem repetir trabalho já comprovado.\n${overview(removed)}`;
      const retained = preservedContext(removed);
      const candidate = [...messages.slice(0, 2), { role: "user", content: summary + (retained ? `\n\nESTADO E INSTRUÇÕES PRESERVADOS:\n${retained}` : "") }, ...messages.slice(cut)];
      const candidateSize = estimateContextTokensC7M(candidate, tools);
      if (before - candidateSize < CONTEXT_MIN_SAVING_TOKENS_C7M || candidateSize >= after) continue;
      proposed = candidate;
      after = candidateSize;
      checkpoint = { schema: "localworker-context-checkpoint/v1", id, created_at: new Date().toISOString(),
        entries: removed, before_estimated_tokens: before, after_estimated_tokens: after };
      if (after <= this.contextTokens * CONTEXT_TARGET_FRACTION_C7M) break;
      }
    }
    if (checkpoint) {
      const folder = path.join(this.directory, "context");
      const body = JSON.stringify(checkpoint);
      const hash = createHash("sha256").update(body).digest("hex");
      const file = path.join(folder, `${checkpoint.id}.json`);
      const temporary = `${file}.${process.pid}.tmp`;
      try {
        await fs.mkdir(folder, { recursive: true });
        await fs.writeFile(temporary, body, { flag: "wx" });
        const readBack = await fs.readFile(temporary, "utf8");
        if (createHash("sha256").update(readBack).digest("hex") !== hash) throw new Error("Checkpoint de contexto não verificável; histórico ativo preservado");
        for (let attempt = 0; ; attempt++) {
          try { await fs.rename(temporary, file); break; }
          catch (error) {
            if (process.platform !== "win32" || !["EPERM", "EACCES", "EBUSY"].includes(error?.code) || attempt >= 3) throw error;
            await new Promise(resolve => setTimeout(resolve, 50 * (attempt + 1)));
          }
        }
        messages.splice(0, messages.length, ...proposed);
        this.checkpoints.push({ id: checkpoint.id, sha256: hash, entries: checkpoint.entries.length });
        this.count++;
      } catch (error) {
        this.checkpointUnavailable = true;
        proposed = null;
        checkpoint = null;
        after = before;
        await emit({ phase: "context_compaction_failed", reason, strategy: "checkpoint recusado; histórico ativo íntegro",
          context_before_tokens: before, context_after_tokens: before, context_limit_tokens: this.contextTokens,
          ram_before_bytes: ram?.ramAvailable ?? null, vram_before_mib: gpu?.freeMiB ?? null,
          compaction_count: this.count, error: String(error?.message ?? error).slice(0, 240),
          summary: "Falha ao verificar/persistir checkpoint; histórico original mantido e nova tentativa de arquivo desativada neste job." });
      } finally { await fs.rm(temporary, { force: true }).catch(() => {}); }
    }
    const activeEstimate = proposed ? after : before;
    const reducedContext = (ramPressure || vramPressure) ? lowerContext(this.contextTokens, this.minimumTokens, activeEstimate) : this.contextTokens;
    if (!proposed && reducedContext === this.contextTokens) {
      const signature = `${reason}|${this.contextTokens}|${this.count}`;
      if (signature !== this.lastUnavailable) {
        this.lastUnavailable = signature;
        await emit({ phase: "context_compaction_unavailable", reason, context_before_tokens: before,
          context_after_tokens: before, context_limit_tokens: this.contextTokens,
          ram_before_bytes: ram?.ramAvailable ?? null, vram_before_mib: gpu?.freeMiB ?? null,
          compaction_count: this.count, strategy: "preservar histórico; aguardar recursos/segmentar",
          summary: "Nenhuma redução segura comprovada; histórico preservado. Ollama recebe truncate:false." });
      }
      return false;
    }
    this.contextTokens = reducedContext;
    this.lastPromptTokens = null;
    this.lastUnavailable = null;
    await emit({ phase: "context_compacted", reason, strategy: checkpoint ? "checkpoint íntegro + índice recuperável + histórico recente" : "redução controlada de num_ctx",
      checkpoint_id: checkpoint?.id ?? null, context_before_tokens: before, context_after_tokens: activeEstimate,
      context_limit_tokens: this.contextTokens, ram_before_bytes: ram?.ramAvailable ?? null,
      ram_after_bytes: resources?.sampleRam ? await resources.sampleRam() : null,
      vram_before_mib: gpu?.freeMiB ?? null,
      vram_after_mib: resources?.sampleGpu ? (await resources.sampleGpu())?.freeMiB ?? null : null,
      compaction_count: this.count,
      summary: `Estimativa de contexto ${before} → ${activeEstimate} tokens; janela ativa ${this.contextTokens}; checkpoint ${checkpoint?.id ?? "sem descarte"}.` });
    this.pendingEffect = { reason, strategy: checkpoint ? "checkpoint + histórico recente" : "redução de num_ctx",
      count: this.count, before, after: activeEstimate, ram: ram?.ramAvailable ?? null, vram: gpu?.freeMiB ?? null };
    return true;
  }

  async recall(id, index, offset = 0) {
    if (!/^c\d{4}$/.test(id) || !Number.isSafeInteger(index) || index < 0 ||
        !Number.isSafeInteger(offset) || offset < 0 || !this.checkpoints.some(item => item.id === id)) {
      throw new Error("Referência de checkpoint inválida");
    }
    const record = this.checkpoints.find(item => item.id === id);
    const body = await fs.readFile(path.join(this.directory, "context", `${id}.json`), "utf8");
    if (createHash("sha256").update(body).digest("hex") !== record.sha256) throw new Error("Checkpoint corrompido; não é seguro reidratar");
    const entry = JSON.parse(body).entries[index];
    if (!entry) throw new Error("Entrada de checkpoint inexistente");
    const content = JSON.stringify(entry);
    return JSON.stringify({ checkpoint_id: id, entry_index: index, offset, total_chars: content.length,
      next_offset: offset + CONTEXT_RECALL_CHARS_C7M < content.length ? offset + CONTEXT_RECALL_CHARS_C7M : null,
      content: content.slice(offset, offset + CONTEXT_RECALL_CHARS_C7M) });
  }
}
