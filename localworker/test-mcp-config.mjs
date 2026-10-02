import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { ensureMcpRegistration } from "./mcp-config.mjs";

const command = process.env.TEST_CODEX_EXE;
if (!command) throw new Error("Defina TEST_CODEX_EXE para o codex.exe instalado");
const fixture = await fs.mkdtemp(path.join(os.tmpdir(), "localworker-mcp-test-"));
if (path.dirname(fixture).toLowerCase() !== os.tmpdir().toLowerCase()) throw new Error("Raiz temporária inesperada");
const configPath = path.join(fixture, "config.toml");
const base = 'model = "gpt-6-sol"\nmodel_reasoning_effort = "high"\n\n[desktop]\nfollowUpQueueMode = "queue"\n';
try {
  await fs.writeFile(configPath, base);
  const options = { configPath, command };
  assert.equal((await ensureMcpRegistration(options)).status, "REPAIRED");
  const first = await fs.readFile(configPath, "utf8");
  assert.match(first, /\[mcp_servers\.localworker\]/);
  assert.match(first, /mcp_optional_startup_grace_ms = 5000/);
  assert.match(first, /startup_timeout_sec = 120/);
  assert.match(first, /model_reasoning_effort = "high"/);
  assert.equal((await ensureMcpRegistration(options)).status, "OK");
  assert.equal(await fs.readFile(configPath, "utf8"), first);
  await assert.rejects(ensureMcpRegistration({ ...options, serverPath: path.join(path.dirname(fileURLToPath(import.meta.url)), "delivery.mjs") }));
  assert.equal(await fs.readFile(configPath, "utf8"), first);
  await fs.writeFile(configPath, base);
  assert.equal((await ensureMcpRegistration(options)).status, "REPAIRED");
  assert.match(await fs.readFile(configPath, "utf8"), /\[mcp_servers\.localworker\]/);
  console.log(JSON.stringify({ first_install: true, idempotent: true, reset_recovered: true, preferences_preserved: true }));
} finally {
  await fs.rm(fixture, { recursive: true, force: true });
}
