import { promises as fs } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { randomUUID } from "node:crypto";
import path from "node:path";

const execFileAsync = promisify(execFile);
const repo = process.env.TEST_REPO_PATH;
if (!repo || path.basename(path.resolve(repo)).toLowerCase() !== "jeancarloem.com.blog") {
  throw new Error("Defina TEST_REPO_PATH para o blog autorizado.");
}
const status = async () => (await execFileAsync("git", ["-C", repo, "status", "--porcelain=v1", "-uall"], { windowsHide: true })).stdout;
const baseline = await status();
if (baseline) throw new Error("Checkout de teste deve iniciar limpo.");
const marker = `localworker-real-test-${randomUUID()}`;
const relative = `.${marker}.txt`;
const target = path.join(repo, relative);
let result = "";
try {
  const { runLocalAnalysis } = await import("./worker-core.mjs");
  result = await runLocalAnalysis(repo,
    `Teste operacional mínimo: crie exclusivamente o arquivo ${relative} com uma única linha literal ${marker}. Não altere outro arquivo. Use write_file e então responda com o caminho.`,
    "write", async event => {
      if (["step", "tool", "tool_result", "write_budget_warning", "ollama_error"].includes(event.phase))
        process.stdout.write(JSON.stringify(event) + "\n");
    }, [], true);
  if ((await fs.readFile(target, "utf8")).trim() !== marker) throw new Error("Conteúdo do arquivo de teste diverge.");
  process.stdout.write(JSON.stringify({ test: "real-write", status: "ok", result: result.slice(0, 300) }) + "\n");
} finally {
  const content = await fs.readFile(target, "utf8").catch(error => error?.code === "ENOENT" ? null : Promise.reject(error));
  if (content?.trim() === marker) await fs.rm(target);
  const after = await status();
  if (after !== baseline) throw new Error(`Git do blog divergiu do baseline; preserve e inspecione: ${after}`);
}
