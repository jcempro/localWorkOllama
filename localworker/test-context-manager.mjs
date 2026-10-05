import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { ContextManagerC7M, estimateContextTokensC7M } from "./context-manager.mjs";
import { PAGE_M7Q } from "./monitor-page.mjs";

const directory = await fs.mkdtemp(path.join(os.tmpdir(), "localworker-context-"));
try {
  const original = [
    { role: "system", content: "NORMA ABSOLUTA: preservar dados e autorizações. " .repeat(40) },
    { role: "user", content: "Objetivo original e contratos obrigatórios." },
    { role: "assistant", content: "Decisão consolidada: editar somente o módulo autorizado." },
    { role: "tool", tool_name: "read_file", content: "EVIDÊNCIA A ".repeat(2600) },
    { role: "assistant", content: "Decisão: preservar comportamento anterior." },
    { role: "tool", tool_name: "read_file", content: "EVIDÊNCIA B ".repeat(2600) },
    ...Array.from({ length: 8 }, (_, i) => ({ role: i % 2 ? "tool" : "assistant", content: `Recente ${i}` })),
  ];
  const messages = structuredClone(original);
  const manager = new ContextManagerC7M(directory, 32768);
  const events = [];
  const before = estimateContextTokensC7M(messages);
  const changed = await manager.prepare(messages, [], { ram: { ramAvailable: 5 * 1024 ** 3, ramReserve: 4.5 * 1024 ** 3 },
    gpu: { freeMiB: 1024, reserveMiB: 512 }, sampleRam: () => 5 * 1024 ** 3 }, event => events.push(event));
  assert.equal(changed, true);
  assert.equal(messages[0].content, original[0].content);
  assert.equal(messages[1].content, original[1].content);
  assert.ok(estimateContextTokensC7M(messages) < before);
  assert.equal(manager.count, 1);
  assert.ok(events.some(event => event.phase === "context_compacted" && event.context_before_tokens > event.context_after_tokens));
  await manager.observed(1600, { ram: 5.2 * 1024 ** 3, gpu: { freeMiB: 1200 } }, event => events.push(event));
  assert.ok(events.some(event => event.phase === "context_effect_observed" && event.prompt_tokens_observed === 1600));
  const recalled = JSON.parse(await manager.recall("c0001", 0));
  assert.equal(JSON.parse(recalled.content).content, original[2].content);
  await assert.rejects(manager.recall("c0001", 99), /inexistente/);
  const archive = path.join(directory, "context", "c0001.json");
  const saved = JSON.parse(await fs.readFile(archive, "utf8"));
  assert.deepEqual(saved.entries, original.slice(2, 6));
  const stable = JSON.stringify(messages);
  await manager.prepare(messages, [], { ram: { ramAvailable: 9 * 1024 ** 3, ramReserve: 4 * 1024 ** 3 } });
  assert.equal(JSON.stringify(messages), stable);
  await fs.writeFile(archive, "corrompido");
  await assert.rejects(manager.recall("c0001", 0), /corrompido/);

  const unavailable = new ContextManagerC7M(null, 32768);
  const full = structuredClone(original);
  assert.equal(await unavailable.prepare(full, [], { ram: { ramAvailable: 4.1 * 1024 ** 3, ramReserve: 4 * 1024 ** 3 } }), false);
  assert.deepEqual(full, original);
  const blocked = path.join(directory, "blocked-file");
  await fs.writeFile(blocked, "impede criar subdiretório");
  const failed = new ContextManagerC7M(blocked, 32768);
  const failedMessages = structuredClone(original);
  const failureEvents = [];
  await failed.prepare(failedMessages, [], { ram: { ramAvailable: 5 * 1024 ** 3, ramReserve: 4.5 * 1024 ** 3 } }, event => failureEvents.push(event));
  assert.deepEqual(failedMessages, original);
  assert.equal(failed.count, 0);
  assert.ok(failureEvents.some(event => event.phase === "context_compaction_failed"));
  assert.ok(!failureEvents.some(event => event.phase === "context_compacted"));
  assert.equal(new ContextManagerC7M(null, 4096).minimumTokens, 4096);
  // Regressão: base fixa acima de 56% e retorno recente volumoso não podem impedir toda redução.
  const adaptive = new ContextManagerC7M(path.join(directory, "adaptive"), 32768);
  const dense = [{ role: "system", content: "norma ".repeat(6500) }, { role: "user", content: "objetivo" },
    { role: "assistant", content: "Decisão necessária à continuidade.", tool_calls: [{ function: { name: "read_file", arguments: { path: "source.py" } } }] },
    { role: "tool", tool_name: "read_file", content: "source.py\n" + "evidence ".repeat(4000) }];
  const pendingDense = JSON.stringify(dense);
  assert.equal(await adaptive.prepare(dense, [], {}), false);
  assert.equal(JSON.stringify(dense), pendingDense, "evidência recém-lida deve chegar ao modelo");
  dense.push({ role: "assistant", content: "Evidência examinada; decisão mantida." });
  assert.equal(await adaptive.prepare(dense, [], {}), true);
  assert.match(dense[2].content, /Decisão necessária/);
  assert.ok(estimateContextTokensC7M(dense) > 32768 * .56);
  assert.equal(adaptive.count, 1);
  for (let i = 0; i < 5; i++) {
    dense.push({ role: "assistant", content: `Decisão ${i}` }, { role: "tool", content: "nova evidência ".repeat(2500) }, {role:"assistant",content:"Evidência examinada."});
    assert.equal(await adaptive.prepare(dense, [], { forceCompaction: true }), true);
  }
  assert.equal(adaptive.count, 6);
  assert.match(dense[2].content, /Decisão necessária/);
  assert.match(dense[2].content, /Decisão 0/);
  assert.equal(await adaptive.prepare(dense, [], { forceCompaction: true }), false);
  assert.match(PAGE_M7Q, /context_compactions/);
  assert.match(PAGE_M7Q, /function contextDiagnostic/);
  for (const script of PAGE_M7Q.split("<script>").slice(1)) new vm.Script(script.split("</script>")[0]);
  console.log(JSON.stringify({ context: "ok", saved_entries: saved.entries.length, before, after: estimateContextTokensC7M(messages) }));
} finally {
  await fs.rm(directory, { recursive: true, force: true });
}
