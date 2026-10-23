import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { ContextManagerC7M, estimateContextTokensC7M } from "./context-manager.mjs";

const tempRoot = await fs.realpath(os.tmpdir());
const directory = await fs.mkdtemp(path.join(tempRoot, "localworker-d2c-"));
const norm = "--- INSTRUÇÃO DO REPOSITÓRIO: AGENTS.md ---\nNORMA LITERAL NÃO DESCARTÁVEL\n--- FIM DA INSTRUÇÃO ---";
const body = `manual.md [linhas 1-100/100]\n${norm}\n${"evidência integral ".repeat(1600)}`;
const tool = content => ({ role: "tool", tool_name: "read_file", content });
const read = () => ({ role: "assistant", content: "", tool_calls: [{ function: { name: "read_file", arguments: { path: "manual.md" } } }] });
const initial = () => [{ role: "system", content: "REGRAS ORIGINAIS" }, { role: "user", content: "OBJETIVO ORIGINAL" }];

try {
  // Três ocorrências já examinadas: uma cópia ativa, três entradas integrais recuperáveis.
  const messages = [...initial(), read(), tool(body), read(), tool(body), read(), tool(body),
    { role: "assistant", content: "Decisão consolidada: preservar o documento." }];
  const original = structuredClone(messages), manager = new ContextManagerC7M(path.join(directory, "removed"), 32768), events = [];
  assert.equal(await manager.prepare(messages, [], { forceCompaction: true }, e => events.push(e)), true);
  assert.deepEqual(messages.slice(0, 2), original.slice(0, 2));
  assert.equal(messages[2].content.split(body).length - 1, 1);
  assert.match(messages[2].content, /Decisão consolidada/);
  assert.match(messages[2].content, /D2C: 2 cópia/);
  const checkpoint = JSON.parse(await fs.readFile(path.join(directory, "removed/context/c0001.json"), "utf8"));
  assert.deepEqual(checkpoint.entries, original.slice(2));
  assert.equal(checkpoint.markdown_duplicates_deduplicated, 2);
  assert.equal(events.find(e => e.phase === "context_compacted").markdown_duplicates_deduplicated, 2);
  let recalled = "", offset = 0;
  do { const page = JSON.parse(await manager.recall("c0001", 3, offset)); recalled += page.content; offset = page.next_offset; } while (offset !== null);
  assert.deepEqual(JSON.parse(recalled), original[5]);
  assert.equal(await manager.prepare(messages, [], { forceCompaction: true }), false, "não compactar novamente sem economia");
  // Novo retorno idêntico após checkpoint: proveniência interna mantém só uma cópia.
  messages.push(read(), tool(body), {role:"assistant",content:"Nova decisão consolidada."});
  const secondOriginal = structuredClone(messages);
  assert.equal(await manager.prepare(messages, [], { forceCompaction: true }), true);
  assert.equal(messages[2].content.split(body).length - 1, 1);
  assert.match(messages[2].content, /Nova decisão consolidada/);
  assert.match(messages[2].content, /Decisão consolidada/);
  const secondCheckpoint = JSON.parse(await fs.readFile(path.join(directory,"removed/context/c0002.json"),"utf8"));
  assert.deepEqual(secondCheckpoint.entries, secondOriginal.slice(2));
  assert.equal(secondCheckpoint.markdown_duplicates_deduplicated, 1);

  // A única cópia ativa pode estar no lote retido e ainda não visto; ele fica byteidêntico.
  const pending = [...initial(), read(), tool(body), read(), tool(body), read(), tool(body)];
  const pendingOriginal = structuredClone(pending), pendingManager = new ContextManagerC7M(path.join(directory, "pending"), 32768);
  assert.equal(await pendingManager.prepare(pending, [], { forceCompaction: true }), true);
  assert.deepEqual(pending.slice(-2), pendingOriginal.slice(-2));
  assert.equal(pending.filter(m => m.content?.includes(body)).length, 1);
  const pendingCheckpoint = JSON.parse(await fs.readFile(path.join(directory, "pending/context/c0001.json"), "utf8"));
  assert.deepEqual(pendingCheckpoint.entries, pendingOriginal.slice(2, -2));
  assert.equal(pendingCheckpoint.markdown_duplicates_deduplicated, 2);
  assert(pending.at(-1).content.includes(norm));

  // Um byte ou identificação diferente: nenhum documento único é descartado.
  const changed = [...initial(), read(), tool(body), read(), tool(body.replace("integral", "íntegral")), read(), tool(body.replace("manual.md", "other.md")),
    { role: "assistant", content: "Decisão preservada." }];
  const changedOriginal = structuredClone(changed), changedManager = new ContextManagerC7M(path.join(directory, "changed"), 32768);
  assert.equal(await changedManager.prepare(changed, [], { forceCompaction: true }), false);
  assert.deepEqual(changed, changedOriginal);

  // Instruções humanas e decisões nunca são deduplicadas, mesmo que repitam o corpo.
  const human = [...initial(), { role: "user", content: body }, { role: "user", content: body },
    { role: "assistant", content: body }, { role: "assistant", content: body }];
  const humanOriginal = structuredClone(human), humanManager = new ContextManagerC7M(path.join(directory, "human"), 32768);
  assert.equal(await humanManager.prepare(human, [], { forceCompaction: true }), false);
  assert.deepEqual(human, humanOriginal);

  // Perda de persistência mantém todas as ocorrências ativas e não reporta sucesso.
  const blocked = path.join(directory, "blocked"); await fs.writeFile(blocked, "arquivo, não diretório");
  const failed = structuredClone(original), failedManager = new ContextManagerC7M(blocked, 32768), failedEvents = [];
  assert.equal(await failedManager.prepare(failed, [], { forceCompaction: true }, e => failedEvents.push(e)), false);
  assert.deepEqual(failed, original); assert.equal(failedManager.count, 0);
  assert(failedEvents.some(e => e.phase === "context_compaction_failed"));
  assert(!failedEvents.some(e => e.phase === "context_compacted"));

  // Um resumo legado não perde documentos pela busca de substrings sem proveniência.
  const legacy = [...initial(), { role: "user", content: "CHECKPOINT DE CONTEXTO antigo\n\nESTADO E INSTRUÇÕES PRESERVADOS:\n" + body + "\n\n" + body },
    { role: "assistant", content: "seguir" }];
  const legacyOriginal = structuredClone(legacy), legacyManager = new ContextManagerC7M(path.join(directory, "legacy"), 32768);
  assert.equal(await legacyManager.prepare(legacy, [], { forceCompaction: true }), false);
  assert.deepEqual(legacy, legacyOriginal);
  console.log(JSON.stringify({ result: "D2C_OK", before_estimated_tokens: estimateContextTokensC7M(original), after_estimated_tokens: estimateContextTokensC7M(messages),
    cases: ["removed_duplicates", "retained_pending_batch", "byte_or_path_difference", "human_decisions", "checkpoint_failure", "legacy_summary", "recall_exact", "no_repeat_without_saving", "next_compaction_provenance"] }));
} finally {
  assert.equal(path.dirname(path.resolve(directory)), tempRoot);
  assert(path.basename(directory).startsWith("localworker-d2c-"));
  await fs.rm(directory, { recursive: true, force: true });
}
