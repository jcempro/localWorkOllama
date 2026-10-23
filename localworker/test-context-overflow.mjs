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
let markdownReadD2C = null, markdownCompactedD2C = false;
const rejectedDraftC7M = "RASCUNHO_INTEGRAL_C7M " + "evidência preliminar sem aceite. ".repeat(8000) + " FIM_INTEGRAL_C7M";
const server = createServer(async (req, res) => {
  let body = ""; for await (const chunk of req) body += chunk;
  if (req.url === "/api/ps") { res.end('{"models":[]}'); return; }
  const payload = JSON.parse(body); requests++;
  assert.equal(payload.truncate, false);
  assert.equal(payload.shift, false);
  if (scenario === "markdown-repeat") {
    let message;
    if (requests <= 2) {
      if (requests === 2) {
        markdownReadD2C = payload.messages.at(-1).content;
        assert.match(markdownReadD2C, /AGENTS\.md \[linhas /i);
      }
      message = {role:"assistant",content:"",tool_calls:[{function:{name:"read_file",arguments:{path:"AGENTS.md",startLine:1,endLine:60}}}]};
    } else {
      assert.ok(requests <= 4);
      const compacted = payload.messages.some(m => m.content?.includes("D2C:"));
      if (requests === 3 && !compacted) {
        res.writeHead(400, {"Content-Type":"application/json"});
        res.end(JSON.stringify({error:"request (37494 tokens) exceeds the available context size (32768 tokens)"})); return;
      }
      assert.ok(compacted);
      assert.equal(payload.messages.at(-1).content, markdownReadD2C, "último lote íntegro");
      assert.equal(payload.messages.filter(m => m.content?.includes(markdownReadD2C)).length, 1, "uma cópia literal ativa");
      assert.ok(payload.tools.some(t => t.function.name === "context_recall"));
      markdownCompactedD2C = true;
      message = {role:"assistant",content:"RESULTADO: leitura Markdown repetida preservada sem redundância; mesmo job concluído."};
    }
    res.setHeader("Content-Type","application/json"); res.end(JSON.stringify({message})); return;
  }
  if (scenario === "rejected-draft") {
    assert.ok(!JSON.stringify(payload.messages).includes("PRIVATE_THINKING_SENTINEL_C7M"));
    let message;
    if (requests === 1) message = {role:"assistant",content:"DECISÃO CONSOLIDADA_C7M",tool_calls:[{function:{name:"file_info",arguments:{path:"README.md"}}}]};
    else if (requests === 2) message = {role:"assistant",content:rejectedDraftC7M,thinking:"PRIVATE_THINKING_SENTINEL_C7M"};
    else if (requests === 3) {
      const context=JSON.stringify(payload.messages);
      assert.ok(context.includes("RASCUNHO DE CONCLUSÃO RECUSADA; sem aceite"));
      assert.ok(!context.includes("FIM_INTEGRAL_C7M"));
      assert.ok(context.includes("DECISÃO CONSOLIDADA_C7M"));
      assert.ok(context.includes("Conclusão recusada: CONTRACT_UNFULFILLED"));
      assert.ok(payload.tools.some(t=>t.function.name==="context_recall"));
      message={role:"assistant",content:"",tool_calls:[{function:{name:"read_file",arguments:{path:"README.md",startLine:1,endLine:1}}}]};
    } else {assert.equal(requests,4);message={role:"assistant",content:"RESULTADO: obrigação atendida no mesmo job após checkpoint integral do rascunho."};}
    res.setHeader("Content-Type","application/json");res.end(JSON.stringify({message}));return;
  }
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
  for (scenario of ["recover", "fixed", "rejected-draft", "markdown-repeat"]) {
    requests = 0;
    const id = randomUUID(), dir = jobDir(id), at = new Date().toISOString();
    await fs.mkdir(dir, { recursive: true });
    try {
      await atomicJson(path.join(dir, "state.json"), { job_id: id, status: "QUEUED", created_at: at });
      await atomicJson(path.join(dir, "request.json"), { repoPath: repo, task: "Teste de continuidade; somente leitura.", mode: "read-only",
        ...(scenario==="rejected-draft"?{required_read_paths:["README.md"]}:scenario==="markdown-repeat"?{required_read_paths:["AGENTS.md"]}:{}) });
      // Nunca enviar mensagem a chat real durante reprodução determinística.
      await atomicJson(path.join(dir, "delivery.json"), { status: "TEST_SUPPRESSED" });
      await promisify(execFile)(process.execPath, [fileURLToPath(new URL("./worker-runner.mjs", import.meta.url)), id], {
        windowsHide: true, timeout: 120_000, env: { ...process.env, OLLAMA_URL: `http://127.0.0.1:${server.address().port}`, LOCAL_MODEL: "fake-context-overflow", LOCAL_WORKER_CONTEXT_TRIGGER_FRACTION: "0.8" }
      });
      const state = JSON.parse(await fs.readFile(path.join(dir, "state.json"), "utf8"));
      if (scenario === "recover" && state.status !== "COMPLETED") console.log(await fs.readFile(path.join(dir, "worker.log"), "utf8"));
      assert.equal(state.status, scenario !== "fixed" ? "COMPLETED" : "FAILED", await fs.readFile(path.join(dir, "error.txt"), "utf8").catch(() => ""));
      if(scenario==="markdown-repeat")assert.ok(requests===3||requests===4);
      else assert.equal(requests, scenario !== "fixed" ? 4 : 1);
      if (scenario !== "fixed") assert.ok(state.context_compactions >= 1);
      else assert.equal(state.error_kind, "WORKER_INCOMPLETE");
      const result = await fs.readFile(path.join(dir, scenario !== "fixed" ? "result.md" : "error.txt"), "utf8");
      assert.match(result, /ESTADO GIT DETERMINÍSTICO/);
      if (scenario === "fixed") assert.match(result, /CONTEXT_CAPACITY/);
      if(scenario==="markdown-repeat"){
        assert.equal(markdownCompactedD2C,true);
        const checkpoints=await Promise.all((await fs.readdir(path.join(dir,"context"))).map(async name=>JSON.parse(await fs.readFile(path.join(dir,"context",name),"utf8"))));
        assert.ok(checkpoints.some(c=>c.markdown_duplicates_deduplicated>=1&&c.entries.some(e=>e.tool_name==="read_file"&&e.content===markdownReadD2C)));
        const log=(await fs.readFile(path.join(dir,"worker.log"),"utf8")).trim().split(/\r?\n/).map(line=>{
          const start=line.indexOf("{"); assert.ok(start>=0); return JSON.parse(line.slice(start));
        });
        assert.ok(log.some(e=>e.phase==="context_compacted"&&e.markdown_duplicates_deduplicated>=1));
        assert.match(result,/Leituras: \["agents\.md"\]/i);
      }
      if(scenario==="rejected-draft"){
        const checkpoints=await Promise.all((await fs.readdir(path.join(dir,"context"))).map(async name=>JSON.parse(await fs.readFile(path.join(dir,"context",name),"utf8"))));
        const checkpoint=checkpoints.find(c=>c.entries.some(e=>e.content===rejectedDraftC7M));
        assert.ok(checkpoint);
        const index=checkpoint.entries.findIndex(e=>e.content===rejectedDraftC7M);
        assert.ok(checkpoint.rejected_draft_entries.includes(index));
        assert.ok(!JSON.stringify(checkpoints).includes("PRIVATE_THINKING_SENTINEL_C7M"));
        assert.match(result,/Leituras: \["README\.md"\]/i); // Runtime normalizes Windows path identity.
      }
    } finally {
      const resolved = await fs.realpath(dir);
      const root = await fs.realpath(JOBS);
      assert.equal(path.dirname(resolved).toLowerCase(), root.toLowerCase());
      await fs.rm(resolved, { recursive: true, force: true });
    }
  }
  console.log("overflow: recuperação no mesmo job; base irredutível sem retry; rascunho recusado integral em checkpoint; D2C Markdown literal ativo único e checkpoint íntegro; decisão/feedback/requisitos mantidos; sem pensamento privado");
} finally { server.close(); }
