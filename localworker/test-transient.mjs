import { createServer } from "node:http";
import { spawn } from "node:child_process";
import path from "node:path";
import os from "node:os";
import assert from "node:assert/strict";

const repo = process.env.TEST_REPO_PATH;
if (!repo || path.basename(path.resolve(repo)).toLowerCase() !== "jeancarloem.com.blog") {
  throw new Error("Defina TEST_REPO_PATH para a cópia de jeancarloem.com.blog usada apenas nos testes.");
}

async function status() {
  return new Promise((resolve, reject) => {
    const child = spawn("git", ["-C", repo, "status", "--porcelain=v1", "-uall"], { windowsHide: true });
    let output = "";
    child.stdout.on("data", chunk => { output += chunk; });
    child.on("error", reject);
    child.on("exit", code => code === 0 ? resolve(output) : reject(new Error(`git status ${code}`)));
  });
}

const baseline = await status();
let calls = 0;
let unloadCalls = 0;
let noToolMode = false;
let noToolCalls = 0;
const events = [];
const ollama = createServer(async (req, res) => {
  let body = "";
  for await (const chunk of req) body += chunk;
  const payload = JSON.parse(body);
  if (req.url === "/proxy/api/generate") {
    assert.equal(payload.model, "fake-test-model");
    assert.equal(payload.keep_alive, 0);
    assert.equal(payload.stream, false);
    unloadCalls++;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ done: true }));
    return;
  }
  assert.equal(req.url, "/proxy/api/chat");
  if (noToolMode) {
    noToolCalls++;
    if (noToolCalls === 2) assert.deepEqual(payload.tools.map(tool => tool.function.name), ["git_status"]);
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ message: noToolCalls === 2
      ? { role: "assistant", content: "", tool_calls: [{ function: { name: "git_status", arguments: {} } }] }
      : { role: "assistant", content: noToolCalls === 1 ? "RESULTADO: sem inspeção." : "RESULTADO: Git consultado." } }));
    return;
  }
  assert.ok(payload.options.num_thread >= 1 &&
    (os.availableParallelism() === 1 || payload.options.num_thread < os.availableParallelism()));
  assert.equal(payload.keep_alive, "2m");
  calls++;
  if (calls === 1) {
    req.socket.destroy();
    return;
  }
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({ message: calls === 2
    ? { role: "assistant", content: "", tool_calls: [{ function: { name: "git_status", arguments: {} } }] }
    : { role: "assistant", content: "RESULTADO: transporte recuperado e Git consultado." } }));
});
await new Promise(resolve => ollama.listen(0, "127.0.0.1", resolve));
process.env.OLLAMA_URL = `http://127.0.0.1:${ollama.address().port}/proxy`;
process.env.LOCAL_MODEL = "fake-test-model";
try {
  const { runLocalAnalysis, resourceBudgetR8N, gpuBudgetR8N, relieveGpuPressureR8N, unloadWorkerModelR8N,
    estimateGpuLayersR8N } = await import("./worker-core.mjs");
  assert.deepEqual(resourceBudgetR8N(8, 16 * 1024 ** 3, 1 * 1024 ** 3, "auto").allow, false);
  assert.equal(resourceBudgetR8N(8, 16 * 1024 ** 3, 8 * 1024 ** 3, "auto").threads, 6);
  assert.equal(resourceBudgetR8N(2, 8 * 1024 ** 3, 8 * 1024 ** 3, 99).threads, 1);
  assert.equal(resourceBudgetR8N(36, 64 * 1024 ** 3, 9 * 1024 ** 3, "auto").allow, true,
    "Modelo carregado com 9 GiB livres deve preservar o sistema e continuar o job");
  assert.equal(gpuBudgetR8N(12_288, 512, 0).allow, false);
  assert.equal(gpuBudgetR8N(12_288, 2_048, 0).reserveMiB, 1_229);
  assert.equal(estimateGpuLayersR8N(48, 53_233_445_762, 10_492_544_285, 609, 1_229), 8);
  assert.equal(estimateGpuLayersR8N(48, 53_233_445_762, 10_492_544_285, 609, 1_229, 8), 7);
  let unloads = 0;
  const pressureEvents = [];
  assert.equal(await relieveGpuPressureR8N(async () => gpuBudgetR8N(12_288, 540, 0),
    async () => { unloads++; }, async event => pressureEvents.push(event)), true);
  assert.equal(unloads, 1);
  assert.equal(await relieveGpuPressureR8N(async () => gpuBudgetR8N(12_288, 540, 0), unloadWorkerModelR8N), true);
  assert.equal(unloadCalls, 1);
  assert.deepEqual(pressureEvents.map(event => event.phase), ["resource_pressure", "resource_released"]);
  assert.equal(await relieveGpuPressureR8N(async () => gpuBudgetR8N(12_288, 2_048, 0),
    async () => { unloads++; }), false);
  assert.equal(unloads, 1);
  const result = await runLocalAnalysis(repo, "Teste read-only do retry HTTP; consulte Git e conclua.", "read-only", async event => events.push(event));
  assert.match(result, /transporte recuperado/);
  assert.equal(calls, 3);
  assert.ok(events.some(x => x.phase === "ollama_error" && x.retryable));
  assert.ok(events.some(x => x.phase === "tool" && x.tool === "git_status"));
  noToolMode = true;
  const recovered = await runLocalAnalysis(repo, "Consulte git_status antes de responder.", "read-only");
  assert.match(recovered, /Git consultado/);
  assert.equal(noToolCalls, 3);
  assert.equal(await status(), baseline, "Git deve permanecer no estado inicial");
  console.log(JSON.stringify({ status: "transient-recovered", calls, git: "preserved" }));
} finally {
  ollama.close();
}
