import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repo = process.env.TEST_REPO_PATH;
if (!repo || path.basename(path.resolve(repo)).toLowerCase() !== "jeancarloem.com.blog") throw new Error("Use o repositório de teste autorizado.");
const core = await import(pathToFileURL(process.env.TEST_CORE_PATH ?? path.join(path.dirname(fileURLToPath(import.meta.url)), "worker-core.mjs")));
const exec = promisify(execFile);
const git = async args => (await exec("git", ["-C", repo, ...args], { windowsHide: true })).stdout;
const before = await git(["status", "--porcelain=v1", "-uall"]);
const beforeHead = (await git(["rev-parse", "HEAD"])).trim();
const relative = `.localworker-commit-${randomUUID()}.txt`;
const file = path.join(repo, relative);
try {
  await fs.writeFile(file, "Teste isolado de guarda de commit.\n");
  const dirty = await core.initiallyDirtyPaths(repo);
  assert.ok(dirty.has(relative.toLowerCase()));
  const context = { failedValidations: new Set(), initiallyDirty: dirty, touched: new Set([relative.toLowerCase()]), required: new Set() };
  await assert.rejects(() => core.gitCommitUnit(repo, "Teste de guarda", [relative], context), /já alterado antes deste job/);
  await assert.rejects(() => core.gitCommitUnit(repo, "Teste de guarda", ["../fora.txt"],
    { ...context, initiallyDirty: new Set() }), /fora do repositório/);
  await assert.rejects(() => core.gitCommitUnit(repo, "Teste de guarda", [relative],
    { ...context, initiallyDirty: new Set(), failedValidations: new Set(["teste-falho"]) }), /Validações falhas/);
  await git(["add", "-N", "--", relative]);
  await git(["commit", "--only", "--dry-run", "-m", "Teste não efetivado", "--", relative]);
  assert.equal((await git(["rev-parse", "HEAD"])).trim(), beforeHead);
  console.log(JSON.stringify({ status: "ok", preexisting_rejected: true, outside_rejected: true,
    failed_validation_rejected: true, dry_run_only: true }));
} finally {
  await git(["reset", "-q", "--", relative]).catch(() => {});
  await fs.rm(file, { force: true });
  assert.equal(await git(["status", "--porcelain=v1", "-uall"]), before);
  assert.equal((await git(["rev-parse", "HEAD"])).trim(), beforeHead);
}
