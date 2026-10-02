import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { pathToFileURL } from "node:url";

const repo = process.env.TEST_REPO_PATH;
const core = process.env.TEST_CORE_PATH;
if (!repo || path.basename(path.resolve(repo)).toLowerCase() !== "jeancarloem.com.blog" || !core) {
  throw new Error("Defina TEST_REPO_PATH para o blog autorizado e TEST_CORE_PATH para o runtime instalado.");
}
const execFileAsync = promisify(execFile);
const git = async () => (await execFileAsync("git", ["-C", repo, "status", "--porcelain=v1", "-uall"],
  { windowsHide: true })).stdout;
const baseline = await git();
const ahead = Number((await execFileAsync("git", ["-C", repo, "rev-list", "--count", "@{upstream}..HEAD"],
  { windowsHide: true })).stdout.trim());
const events = [];
try {
  const { runLocalAnalysis } = await import(pathToFileURL(core).href);
  const result = await runLocalAnalysis(repo,
    "Teste operacional somente leitura: execute git_status e responda em uma frase qual é o ramo atual; não altere arquivos.",
    "read-only", async event => {
      events.push(event);
      if (["gpu_policy_loaded", "resource_budget", "resource_pressure", "gpu_layers_adjusted", "step", "tool_result"].includes(event.phase))
        process.stdout.write(JSON.stringify(event) + "\n");
    });
  assert.match(result, /\S/);
  if (ahead === 0) assert.doesNotMatch(result, /commits? não enviados|à frente do upstream|divergência local em relação ao remoto/i,
    "A resposta não pode confundir arquivo modificado com commit não enviado.");
  const expected = process.env.TEST_EXPECT_GPU_LAYERS;
  if (expected !== undefined) {
    assert.ok(events.some(event => event.phase === "gpu_policy_loaded" && event.gpu_layers === Number(expected)),
      `Calibração esperada de ${expected} camadas não foi carregada.`);
  }
  process.stdout.write(JSON.stringify({ test: "real-read", status: "ok", result: result.slice(0, 1000) }) + "\n");
} finally {
  assert.equal(await git(), baseline, "Git do blog deve voltar exatamente ao estado inicial.");
}
