import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import { createServer } from "node:http";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { jobDir, atomicJson, JOBS } from "./job-store.mjs";
const repo = process.env.TEST_REPO_PATH;
if (!repo || path.basename(path.resolve(repo)).toLowerCase() !== "jeancarloem.com.blog") throw Error("Use o repositório de testes autorizado");
let requests = 0, scenario = "recover";
const server = createServer(async (req, res) => {
  let body = ""; for await (const chunk of req) body += chunk;
  if (req.url === "/api/ps") { res.end('{"models":[]}'); return; }
  const payload = JSON.parse(body); requests++;
  assert.equal(payload.truncate, false);
  assert.equal(payload.shift, false);
  if (scenario === "fixed" || requests === 3) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "request (37494 tokens) exceeds the available context size (32768 tokens)" })); return;
  }
  if (requests === 4) {
    assert.ok(payload.messages.some(m => m.content?.includes("CHECKPOINT DE CONTEXTO")));
    assert.ok(payload.messages.some(m => m.content?.includes("DECISÃO PRESERVADA")));
    assert.ok(payload.tools.some(t => t.function.name === "context_recall"));
  }
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({ message: requests <= 2 ? { role: "assistant", content: "DECISÃO PRESERVADA",
    tool_calls: [{ function: { name: "file_info", arguments: { path: requests === 1 ? "AGENTS.md" : "package.json", fixture: "evidence ".repeat(400) } } }] }
    : { role: "assistant", content: "RESULTADO: recuperação no mesmo job comprovada." } }));
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
try {
  for (scenario of ["recover", "fixed"]) {
    requests = 0;
    const id = randomUUID(), dir = jobDir(id), at = new Date().toISOString();
    await fs.mkdir(dir, { recursive: true });
    try {
      await atomicJson(path.join(dir, "state.json"), { job_id: id, status: "QUEUED", created_at: at });
      await atomicJson(path.join(dir, "request.json"), { repoPath: repo, task: "Teste de continuidade; somente leitura.", mode: "read-only" });
      // Nunca enviar mensagem a chat real durante reprodução determinística.
      await atomicJson(path.join(dir, "delivery.json"), { status: "TEST_SUPPRESSED" });
      await promisify(execFile)(process.execPath, [fileURLToPath(new URL("./worker-runner.mjs", import.meta.url)), id], {
        windowsHide: true, timeout: 120_000, env: { ...process.env, OLLAMA_URL: `http://127.0.0.1:${server.address().port}`, LOCAL_MODEL: "fake-context-overflow", LOCAL_WORKER_CONTEXT_TRIGGER_FRACTION: "0.8" }
      });
      const state = JSON.parse(await fs.readFile(path.join(dir, "state.json"), "utf8"));
      if (scenario === "recover" && state.status !== "COMPLETED") console.log(await fs.readFile(path.join(dir, "worker.log"), "utf8"));
      assert.equal(state.status, scenario === "recover" ? "COMPLETED" : "FAILED", await fs.readFile(path.join(dir, "error.txt"), "utf8").catch(() => ""));
      assert.equal(requests, scenario === "recover" ? 4 : 1);
      if (scenario === "recover") assert.ok(state.context_compactions >= 1);
      else assert.equal(state.error_kind, "WORKER_INCOMPLETE");
      const result = await fs.readFile(path.join(dir, scenario === "recover" ? "result.md" : "error.txt"), "utf8");
      assert.match(result, /ESTADO GIT DETERMINÍSTICO/);
      if (scenario === "fixed") assert.match(result, /CONTEXT_CAPACITY/);
    } finally {
      const resolved = await fs.realpath(dir);
      const root = await fs.realpath(JOBS);
      assert.equal(path.dirname(resolved).toLowerCase(), root.toLowerCase());
      await fs.rm(resolved, { recursive: true, force: true });
    }
  }
  console.log("overflow: mesma execução recuperada; base irredutível diagnosticada sem retry; Git preservado em ambos os desfechos");
} finally { server.close(); }
