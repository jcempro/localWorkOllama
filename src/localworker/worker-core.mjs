import { promises as fs } from "node:fs";
import { createReadStream } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash, randomUUID } from "node:crypto";

const execFileAsync = promisify(execFile);

const installRoot = path.dirname(fileURLToPath(import.meta.url));
let config = {};
try { config = JSON.parse(await fs.readFile(path.join(installRoot, "config.json"), "utf8")); }
catch (error) { if (error?.code !== "ENOENT") throw error; }
const OLLAMA_URL = process.env.OLLAMA_URL ?? config.ollama_url ?? "http://127.0.0.1:11434";

const MODEL = process.env.LOCAL_MODEL ?? config.model ?? "qwen3-coder-next-32k";

const WORKER_RULES =
  process.env.LOCAL_WORKER_RULES ??
  config.worker_rules ??
  path.join(installRoot, "AGENTS.md");

const TOTAL_TIMEOUT_MS = Number(process.env.LOCAL_WORKER_TIMEOUT_MS ?? config.timeout_ms ?? 7_200_000);

const MAX_STEPS = Number(process.env.LOCAL_WORKER_MAX_STEPS ?? config.max_steps ?? 40);

const MAX_FINAL_CHARS = 16_000;
const MAX_TOOL_CHARS = 24_000;
const MAX_FILE_LINES = 600;
const MAX_SEARCH_FILE_BYTES = 2 * 1024 * 1024;
const OLLAMA_ATTEMPTS = Math.max(1, Math.min(10, Number(process.env.LOCAL_OLLAMA_ATTEMPTS ?? config.ollama_attempts ?? 4)));
class ToolRejected extends Error {}

const SKIP_DIRS = new Set([
  ".git",
  "node_modules",
  "_site",
  ".jekyll-cache",
  ".sass-cache",
  ".bundle",
  "coverage",
  ".cache",
]);

function compact(text, max = MAX_TOOL_CHARS) {
  text = String(text ?? "");

  if (text.length <= max) {
    return text;
  }

  const half = Math.floor((max - 80) / 2);

  return (
    text.slice(0, half) +
    "\n\n[... conteúdo truncado ...]\n\n" +
    text.slice(-half)
  );
}

function inside(root, target) {
  const r = path.resolve(root);
  const t = path.resolve(target);

  const rl = r.toLowerCase();
  const tl = t.toLowerCase();

  return tl === rl || tl.startsWith(rl + path.sep.toLowerCase());
}

function resolveRepoPath(repo, relativePath = ".") {
  if (path.isAbsolute(relativePath)) {
    throw new ToolRejected(`Caminho absoluto não permitido: ${relativePath}`);
  }

  const target = path.resolve(repo, relativePath);

  if (!inside(repo, target)) {
    throw new ToolRejected(`Tentativa de acesso fora do repositório: ${relativePath}`);
  }

  return target;
}

async function safeRepoPath(repo, relativePath = ".") {
  const target = resolveRepoPath(repo, relativePath);
  const root = path.resolve(repo);
  const parts = path.relative(root, target).split(path.sep).filter(Boolean);
  let current = root;
  for (const part of parts) {
    current = path.join(current, part);
    try {
      const stat = await fs.lstat(current);
      if (stat.isSymbolicLink()) throw new ToolRejected(`Junction ou link recusado: ${relativePath}`);
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }
  return target;
}

async function writeTextFile(repo, relativePath, content) {
  const target = await safeRepoPath(repo, relativePath);
  if (typeof content !== "string") throw new Error("Conteúdo textual obrigatório");
  await fs.mkdir(path.dirname(target), { recursive: true });
  const temp = `${target}.${process.pid}.tmp`;
  try {
    await fs.writeFile(temp, content, { flag: "wx" });
    await fs.rename(temp, target);
  } finally {
    await fs.rm(temp, { force: true });
  }
  return `Arquivo gravado: ${relativePath}`;
}

async function editTextFile(repo, relativePath, before, after) {
  const target = await safeRepoPath(repo, relativePath);
  if (!before || typeof before !== "string" || typeof after !== "string") {
    throw new Error("Edição requer before não vazio e after textual");
  }
  const old = await fs.readFile(target, "utf8");
  const first = old.indexOf(before);
  if (first < 0 || old.indexOf(before, first + before.length) >= 0) {
    throw new Error("Trecho anterior ausente ou não único; nenhuma alteração feita");
  }
  return writeTextFile(repo, relativePath, old.replace(before, after));
}

async function sha256File(file) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest("hex");
}

async function fileInfo(repo, relativePath) {
  const target = await safeRepoPath(repo, relativePath);
  const stat = await fs.lstat(target);
  if (!stat.isFile()) throw new Error(`Não é arquivo regular: ${relativePath}`);
  return JSON.stringify({ path: relativePath, bytes: stat.size, sha256: await sha256File(target) });
}

async function moveFile(repo, fromPath, toPath, expectedSha256) {
  const from = await safeRepoPath(repo, fromPath);
  const to = await safeRepoPath(repo, toPath);
  if (from.toLowerCase() === to.toLowerCase()) throw new Error("Origem e destino coincidem");
  const source = await fs.lstat(from);
  if (!source.isFile()) throw new Error(`Origem não é arquivo regular: ${fromPath}`);
  const originalHash = await sha256File(from);
  if (originalHash !== expectedSha256) throw new ToolRejected("Hash da origem diverge; arquivo preservado");
  await fs.mkdir(path.dirname(to), { recursive: true });
  await fs.copyFile(from, to, fs.constants.COPYFILE_EXCL);
  const copiedHash = await sha256File(to);
  if (copiedHash !== originalHash) throw new Error(`Cópia divergente; origem preservada; destino exige inspeção: ${toPath}`);
  await fs.unlink(from);
  return `Arquivo movido: ${fromPath} → ${toPath}; sha256=${originalHash}`;
}

async function deleteFile(repo, relativePath, expectedSha256) {
  const target = await safeRepoPath(repo, relativePath);
  const stat = await fs.lstat(target);
  if (!stat.isFile()) throw new Error(`Não é arquivo regular: ${relativePath}`);
  const originalHash = await sha256File(target);
  if (originalHash !== expectedSha256) throw new ToolRejected("Hash diverge; arquivo preservado");
  const recoveryDir = path.join(installRoot, "recovery");
  await fs.mkdir(recoveryDir, { recursive: true });
  const backup = path.join(recoveryDir, `${randomUUID()}.bin`);
  await fs.copyFile(target, backup, fs.constants.COPYFILE_EXCL);
  const backupHash = await sha256File(backup);
  if (backupHash !== originalHash) throw new Error(`Backup divergente; original preservado; backup: ${backup}`);
  await fs.writeFile(`${backup}.json`, JSON.stringify({ repo, path: relativePath, sha256: originalHash, backup }, null, 2) + "\n", { flag: "wx" });
  if (await sha256File(target) !== originalHash) throw new ToolRejected(`Arquivo mudou durante o backup; original preservado; backup: ${backup}`);
  await fs.unlink(target);
  return `Arquivo removido com backup recuperável: ${relativePath}; backup=${backup}; sha256=${originalHash}`;
}

async function runAuthorizedCommand(repo, commandId, authorizedCommands) {
  const command = authorizedCommands.find(item => item.id === commandId);
  if (!command) throw new ToolRejected(`Comando não autorizado: ${commandId}`);
  const { stdout, stderr } = await execFileAsync(command.program, command.args, {
    cwd: repo, windowsHide: true, timeout: command.timeout_ms ?? 300_000,
    maxBuffer: 4 * 1024 * 1024, env: { ...process.env, CI: "1" },
  });
  return compact(`stdout:\n${stdout}\nstderr:\n${stderr}`);
}

async function runCheckedCommand(repo, program, args) {
  const allowed = new Set(["node", "npm", "git"]);
  if (!allowed.has(program) || !Array.isArray(args) || args.some(a => typeof a !== "string")) {
    throw new ToolRejected("Comando inválido ou não permitido");
  }
  if (args.some(a => /[\r\n]/.test(a))) throw new ToolRejected("Argumento multilinha recusado");
  if (program === "node" && !(args[0] === "--check" || args[0] === "--test")) throw new ToolRejected("node limitado a --check/--test");
  if (program === "npm" && !(args[0] === "test" || args[0] === "run")) throw new ToolRejected("npm limitado a test/run");
  if (program === "git" && !(args[0] === "status" || args[0] === "diff")) throw new ToolRejected("git limitado a status/diff");
  const executable = program === "npm" ? process.execPath : program;
  const actualArgs = program === "npm" ? [path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js"), ...args] : args;
  const { stdout, stderr } = await execFileAsync(executable, actualArgs, {
    cwd: repo, windowsHide: true, timeout: 300_000, maxBuffer: 4 * 1024 * 1024,
    env: { ...process.env, CI: "1", npm_config_offline: "true" },
  });
  return compact(`stdout:\n${stdout}\nstderr:\n${stderr}`);
}

async function readOptional(file) {
  try {
    return await fs.readFile(file, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") {
      return "";
    }

    throw error;
  }
}

async function findAgentInDir(dir) {
  try {
    const entries = await fs.readdir(dir, {
      withFileTypes: true,
    });

    const found = entries.find(
      (entry) => entry.isFile() && entry.name.toLowerCase() === "agents.md",
    );

    return found ? path.join(dir, found.name) : null;
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

async function applicableAgentFiles(repo, target) {
  const result = [];
  let current = path.resolve(repo);

  const targetAbs = path.resolve(target);
  const relative = path.relative(current, targetAbs);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    return result;
  }

  const parts = relative.split(path.sep).filter(Boolean);

  // Se target for arquivo, não trate o nome do arquivo como diretório.
  try {
    const stat = await fs.stat(targetAbs);

    if (stat.isFile()) {
      parts.pop();
    }
  } catch {
    // O caminho pode ainda não existir; nesse worker read-only
    // isso normalmente não ocorrerá.
  }

  const rootAgent = await findAgentInDir(current);

  if (rootAgent) {
    result.push(rootAgent);
  }

  for (const part of parts) {
    current = path.join(current, part);

    const agent = await findAgentInDir(current);

    if (agent) {
      result.push(agent);
    }
  }

  return result;
}

function relativeDisplay(repo, file) {
  const value = path.relative(repo, file);
  return value || ".";
}

async function attachInstructions(repo, target, deliveredInstructions, body) {
  const files = await applicableAgentFiles(repo, target);

  const additions = [];

  for (const file of files) {
    const key = file.toLowerCase();

    if (deliveredInstructions.has(key)) {
      continue;
    }

    deliveredInstructions.add(key);

    const text = await fs.readFile(file, "utf8");

    additions.push(
      [
        `--- INSTRUÇÃO DO REPOSITÓRIO: ${relativeDisplay(repo, file)} ---`,
        text,
        "--- FIM DA INSTRUÇÃO ---",
      ].join("\n"),
    );
  }

  if (additions.length === 0) {
    return body;
  }

  return additions.join("\n\n") + "\n\n" + body;
}

async function listDirectory(repo, relativePath, deliveredInstructions) {
  const target = await safeRepoPath(repo, relativePath ?? ".");

  const entries = await fs.readdir(target, {
    withFileTypes: true,
  });

  const result = entries
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 500)
    .map((entry) => {
      const suffix = entry.isDirectory() ? "/" : "";
      return `${entry.name}${suffix}`;
    })
    .join("\n");

  return attachInstructions(
    repo,
    target,
    deliveredInstructions,
    compact(result),
  );
}

async function repoTree(
  repo,
  relativePath,
  maxDepth,
  maxEntries,
  deliveredInstructions,
) {
  const root = await safeRepoPath(repo, relativePath ?? ".");

  const lines = [];
  const limitDepth = Math.max(0, Math.min(Number(maxDepth ?? 3), 6));

  const limitEntries = Math.max(10, Math.min(Number(maxEntries ?? 400), 1000));

  async function walk(dir, depth) {
    if (lines.length >= limitEntries) {
      return;
    }

    const entries = await fs.readdir(dir, {
      withFileTypes: true,
    });

    entries.sort((a, b) => a.name.localeCompare(b.name));

    for (const entry of entries) {
      if (lines.length >= limitEntries) {
        return;
      }

      if (entry.isSymbolicLink()) continue;

      if (entry.isDirectory() && SKIP_DIRS.has(entry.name)) {
        continue;
      }

      const full = path.join(dir, entry.name);
      const rel = relativeDisplay(repo, full);

      lines.push(entry.isDirectory() ? `${rel}/` : rel);

      if (entry.isDirectory() && depth < limitDepth) {
        await walk(full, depth + 1);
      }
    }
  }

  await walk(root, 0);

  let result = lines.join("\n");

  if (lines.length >= limitEntries) {
    result += `\n[limite atingido: ${limitEntries} entradas]`;
  }

  return attachInstructions(repo, root, deliveredInstructions, compact(result));
}

async function readTextFile(
  repo,
  relativePath,
  startLine,
  endLine,
  deliveredInstructions,
) {
  const target = await safeRepoPath(repo, relativePath);

  const stat = await fs.stat(target);

  if (!stat.isFile()) {
    throw new Error(`Não é arquivo: ${relativePath}`);
  }

  if (stat.size > 5 * 1024 * 1024) {
    throw new Error(
      `Arquivo excessivamente grande para leitura textual: ${relativePath}`,
    );
  }

  const text = await fs.readFile(target, "utf8");

  if (text.includes("\0")) {
    throw new Error(`Arquivo aparentemente binário: ${relativePath}`);
  }

  const lines = text.split(/\r?\n/);

  const start = Math.max(1, Number(startLine ?? 1));

  const requestedEnd = Number(endLine ?? start + 299);

  const end = Math.min(
    lines.length,
    start + MAX_FILE_LINES - 1,
    Math.max(start, requestedEnd),
  );

  const body = [];

  for (let i = start; i <= end; i++) {
    body.push(`${String(i).padStart(6, " ")} | ${lines[i - 1]}`);
  }

  const header =
    `${relativeDisplay(repo, target)} ` +
    `[linhas ${start}-${end}/${lines.length}]`;

  return attachInstructions(
    repo,
    target,
    deliveredInstructions,
    compact(`${header}\n${body.join("\n")}`),
  );
}

async function collectFiles(root, maxFiles = 20_000) {
  const result = [];

  async function walk(dir) {
    if (result.length >= maxFiles) {
      return;
    }

    let entries;

    try {
      entries = await fs.readdir(dir, {
        withFileTypes: true,
      });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (result.length >= maxFiles) {
        return;
      }

      if (entry.isSymbolicLink()) continue;

      if (entry.isDirectory() && SKIP_DIRS.has(entry.name)) {
        continue;
      }

      const full = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.isFile()) {
        result.push(full);
      }
    }
  }

  await walk(root);
  return result;
}

async function searchText(
  repo,
  relativePath,
  query,
  regex,
  caseSensitive,
  maxMatches,
  deliveredInstructions,
) {
  const root = await safeRepoPath(repo, relativePath ?? ".");

  const files = await collectFiles(root);

  const limit = Math.max(1, Math.min(Number(maxMatches ?? 100), 300));

  let matcher;

  if (regex) {
    matcher = new RegExp(query, caseSensitive ? "" : "i");
  }

  const needle = caseSensitive ? query : query.toLowerCase();

  const results = [];
  const touchedInstructionTargets = new Set();

  for (const file of files) {
    if (results.length >= limit) {
      break;
    }

    let stat;

    try {
      stat = await fs.stat(file);
    } catch {
      continue;
    }

    if (stat.size > MAX_SEARCH_FILE_BYTES) {
      continue;
    }

    let text;

    try {
      text = await fs.readFile(file, "utf8");
    } catch {
      continue;
    }

    if (text.includes("\0")) {
      continue;
    }

    const lines = text.split(/\r?\n/);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      const matched = regex
        ? matcher.test(line)
        : caseSensitive
          ? line.includes(needle)
          : line.toLowerCase().includes(needle);

      if (!matched) {
        continue;
      }

      results.push(`${relativeDisplay(repo, file)}:${i + 1}: ${line}`);

      touchedInstructionTargets.add(file);

      if (results.length >= limit) {
        break;
      }
    }
  }

  let prefix = "";

  // Entrega automaticamente ao modelo quaisquer AGENTS.md
  // aplicáveis aos arquivos retornados pela busca.
  for (const target of touchedInstructionTargets) {
    const augmented = await attachInstructions(
      repo,
      target,
      deliveredInstructions,
      "",
    );

    if (augmented.trim()) {
      prefix += augmented.trim() + "\n\n";
    }
  }

  const body =
    results.length > 0 ? results.join("\n") : "Nenhuma ocorrência encontrada.";

  return compact(prefix + body);
}

async function gitStatus(repo) {
  const { stdout, stderr } = await execFileAsync(
    "git",
    ["-C", repo, "status", "--short", "--branch"],
    {
      windowsHide: true,
      maxBuffer: 2 * 1024 * 1024,
    },
  );

  return compact(stdout || stderr || "(sem saída)");
}

async function gitDiff(repo, staged) {
  const args = ["-C", repo, "diff"];

  if (staged) {
    args.push("--cached");
  }

  const { stdout, stderr } = await execFileAsync("git", args, {
    windowsHide: true,
    maxBuffer: 8 * 1024 * 1024,
  });

  return compact(stdout || stderr || "(diff vazio)");
}

const TOOL_DEFINITIONS = [
  {
    type: "function",
    function: {
      name: "repo_tree",
      description:
        "Mostra uma árvore limitada do repositório. Use para compreender rapidamente a estrutura antes de leituras detalhadas.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "Caminho relativo ao repositório. Padrão: .",
          },
          maxDepth: {
            type: "integer",
            description: "Profundidade máxima, entre 0 e 6.",
          },
          maxEntries: {
            type: "integer",
            description: "Máximo de entradas retornadas, até 1000.",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_dir",
      description: "Lista diretamente um diretório do repositório.",
      parameters: {
        type: "object",
        required: ["path"],
        properties: {
          path: {
            type: "string",
            description: "Caminho relativo ao repositório.",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "read_file",
      description:
        "Lê trecho de arquivo textual do repositório com números de linha. AGENTS.md aplicáveis são fornecidos automaticamente.",
      parameters: {
        type: "object",
        required: ["path"],
        properties: {
          path: {
            type: "string",
          },
          startLine: {
            type: "integer",
          },
          endLine: {
            type: "integer",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_text",
      description:
        "Pesquisa conteúdo textual recursivamente no repositório. Não pesquisa diretórios gerados/pesados ignorados pelo worker.",
      parameters: {
        type: "object",
        required: ["query"],
        properties: {
          path: {
            type: "string",
            description: "Subdiretório relativo. Padrão: .",
          },
          query: {
            type: "string",
          },
          regex: {
            type: "boolean",
          },
          caseSensitive: {
            type: "boolean",
          },
          maxMatches: {
            type: "integer",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "git_status",
      description: "Obtém git status --short --branch. Somente leitura.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "git_diff",
      description: "Obtém o diff atual do Git. Somente leitura.",
      parameters: {
        type: "object",
        properties: {
          staged: {
            type: "boolean",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "file_info",
      description: "Lê tamanho e SHA-256 de arquivo regular dentro do repositório. Somente leitura.",
      parameters: { type: "object", required: ["path"], properties: { path: { type: "string" } } },
    },
  },
  {
    type: "function",
    function: {
      name: "write_file",
      description: "Cria ou substitui arquivo textual dentro do workspace, sem atravessar links.",
      parameters: { type: "object", required: ["path", "content"], properties: {
        path: { type: "string" }, content: { type: "string" },
      } },
    },
  },
  {
    type: "function",
    function: {
      name: "move_file",
      description: "Move arquivo regular dentro do repositório sem sobrescrever destino; exige SHA-256 previamente consultado.",
      parameters: { type: "object", required: ["from", "to", "expected_sha256"], properties: {
        from: { type: "string" }, to: { type: "string" }, expected_sha256: { type: "string" },
      } },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_file",
      description: "Remove arquivo regular dentro do repositório com backup recuperável; exige SHA-256 previamente consultado.",
      parameters: { type: "object", required: ["path", "expected_sha256"], properties: {
        path: { type: "string" }, expected_sha256: { type: "string" },
      } },
    },
  },
  {
    type: "function",
    function: {
      name: "run_authorized_command",
      description: "Executa pelo ID um comando exato previamente autorizado pelo supervisor para este job, sem shell ou argumentos livres.",
      parameters: { type: "object", required: ["id"], properties: { id: { type: "string" } } },
    },
  },
  {
    type: "function",
    function: {
      name: "edit_file",
      description: "Substitui uma ocorrência textual única no arquivo do workspace.",
      parameters: { type: "object", required: ["path", "before", "after"], properties: {
        path: { type: "string" }, before: { type: "string" }, after: { type: "string" },
      } },
    },
  },
  {
    type: "function",
    function: {
      name: "run_command",
      description: "Executa node, npm ou git no workspace para build, teste ou revisão. Argumentos separados.",
      parameters: { type: "object", required: ["program", "args"], properties: {
        program: { type: "string" }, args: { type: "array", items: { type: "string" } },
      } },
    },
  },
];

const READ_ONLY_TOOLS = new Set(["repo_tree", "list_dir", "read_file", "search_text", "git_status", "git_diff", "file_info"]);

function parseArguments(value) {
  if (value && typeof value === "object") {
    return value;
  }

  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      throw new Error(`Argumentos de ferramenta inválidos: ${value}`);
    }
  }

  return {};
}

async function executeTool(repo, call, deliveredInstructions, mode, authorizedCommands) {
  const name = call?.function?.name;
  const args = parseArguments(call?.function?.arguments);
  if (mode === "read-only" && !READ_ONLY_TOOLS.has(name)) {
    throw new ToolRejected(`Ferramenta recusada em modo read-only: ${name}`);
  }

  switch (name) {
    case "repo_tree":
      return repoTree(
        repo,
        args.path ?? ".",
        args.maxDepth ?? 3,
        args.maxEntries ?? 400,
        deliveredInstructions,
      );

    case "list_dir":
      return listDirectory(repo, args.path ?? ".", deliveredInstructions);

    case "read_file":
      return readTextFile(
        repo,
        args.path,
        args.startLine,
        args.endLine,
        deliveredInstructions,
      );

    case "search_text":
      return searchText(
        repo,
        args.path ?? ".",
        args.query,
        Boolean(args.regex),
        Boolean(args.caseSensitive),
        args.maxMatches ?? 100,
        deliveredInstructions,
      );

    case "git_status":
      return gitStatus(repo);

    case "git_diff":
      return gitDiff(repo, Boolean(args.staged));

    case "file_info":
      return fileInfo(repo, args.path);

    case "write_file":
      return writeTextFile(repo, args.path, args.content);

    case "edit_file":
      return editTextFile(repo, args.path, args.before, args.after);

    case "move_file":
      return moveFile(repo, args.from, args.to, args.expected_sha256);

    case "delete_file":
      return deleteFile(repo, args.path, args.expected_sha256);

    case "run_authorized_command":
      return runAuthorizedCommand(repo, args.id, authorizedCommands);

    case "run_command":
      return runCheckedCommand(repo, args.program, args.args);

    default:
      throw new Error(`Ferramenta desconhecida: ${name}`);
  }
}

function errorChain(error) {
  const parts = [];
  for (let current = error, depth = 0; current && depth < 4; current = current.cause, depth++) {
    parts.push(`${current.name ?? "Error"}: ${current.message ?? String(current)}${current.code ? ` [${current.code}]` : ""}`);
  }
  return parts.join("; cause: ");
}

async function ollamaChat(messages, tools, timeoutMs, onProgress = async () => {}) {
  const deadline = Date.now() + timeoutMs;
  const body = JSON.stringify({
    model: MODEL, messages, tools, stream: false, keep_alive: "30m",
    options: { temperature: 0.1 },
  });
  for (let attempt = 1; attempt <= OLLAMA_ATTEMPTS; attempt++) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new Error("Ollama: timeout total esgotado.");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), remaining);
    try {
      await onProgress({ phase: "ollama_request", attempt });
      const response = await fetch(`${OLLAMA_URL}/api/chat`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body,
        signal: controller.signal,
      });
      if (!response.ok) {
        const error = new Error(`Ollama HTTP ${response.status}: ${await response.text()}`);
        error.status = response.status;
        throw error;
      }
      const result = await response.json();
      await onProgress({ phase: "ollama_response", attempt });
      return result;
    } catch (error) {
      const retryable = error instanceof TypeError || error?.name === "AbortError" || Number(error?.status) >= 500;
      await onProgress({ phase: "ollama_error", attempt, error: errorChain(error), retryable });
      if (!retryable || attempt >= OLLAMA_ATTEMPTS || deadline - Date.now() <= 0) {
        throw new Error(`Ollama /api/chat falhou após ${attempt} tentativa(s): ${errorChain(error)}`, { cause: error });
      }
      const delay = Math.min([0, 5_000, 15_000, 45_000][attempt] ?? 45_000, Math.max(0, deadline - Date.now()));
      await new Promise(resolve => setTimeout(resolve, delay));
    } finally {
      clearTimeout(timer);
    }
  }
}

export class WorkerIncompleteError extends Error {}

export async function runLocalAnalysis(repoPath, task, mode = "read-only", onProgress = async () => {}, authorizedCommands = [], expectChanges = false) {
  if (!Array.isArray(authorizedCommands) || (mode !== "write" && authorizedCommands.length)) {
    throw new Error("Comandos autorizados exigem modo write e lista válida");
  }
  const commandIds = new Set();
  for (const command of authorizedCommands) {
    if (!/^[a-z0-9][a-z0-9_-]{0,63}$/i.test(command?.id ?? "") || commandIds.has(command.id) ||
        typeof command.program !== "string" || !path.isAbsolute(command.program) || /[\r\n]/.test(command.program) ||
        !Array.isArray(command.args) || command.args.some(arg => typeof arg !== "string" || /[\r\n]/.test(arg))) {
      throw new Error("Especificação de comando autorizado inválida ou duplicada");
    }
    commandIds.add(command.id);
  }
  const repo = path.resolve(repoPath);

  const stat = await fs.stat(repo);

  if (!stat.isDirectory()) {
    throw new Error(`repoPath não é diretório: ${repo}`);
  }

  // Prova explícita de que O PRÓPRIO MCP enxerga o filesystem.
  const probe = await fs.readdir(repo);

  console.error(
    `[localWorker] filesystem OK: ${repo}; entries=${probe.length}`,
  );

  const workerRules = await readOptional(WORKER_RULES);
  if (!workerRules.trim()) throw new Error(`WORKER_INFRA_ERROR: AGENTS.md global ausente ou vazio: ${WORKER_RULES}`);

  const rootAgentFile = await findAgentInDir(repo);
  const rootAgent = rootAgentFile
    ? await fs.readFile(rootAgentFile, "utf8")
    : "";
  const preScan = [
    `Raiz: ${repo}`,
    `Entradas imediatas (${probe.length}): ${probe.slice(0, 100).join(", ")}`,
  ];
  for (const name of ["package.json", "Gemfile", "_config.yml"]) {
    const value = await readOptional(path.join(repo, name));
    if (value) preScan.push(`${name}:\n${compact(value, 3000)}`);
  }
  try { preScan.push(`git status:\n${await gitStatus(repo)}`); }
  catch { preScan.push("git status indisponível"); }

  const deliveredInstructions = new Set();

  if (rootAgentFile) {
    deliveredInstructions.add(rootAgentFile.toLowerCase());
  }

  const system = `
Você é o worker local Qwen subordinado a um supervisor OpenAI mais capaz.

Sua função é absorver exploração e análise volumosa localmente, sem transferir trabalho desnecessário ao supervisor.

REGRAS GLOBAIS DO WORKER:
${workerRules || "(nenhum AGENTS.md global encontrado)"}

INSTRUÇÕES RAIZ DO REPOSITÓRIO:
${rootAgent || "(nenhum AGENTS.md na raiz)"}

REGRAS OPERACIONAIS ADICIONAIS:

- Responda integralmente em português do Brasil.
- Modo da tarefa: ${mode}. Em read-only, nenhuma ferramenta de escrita ou comando é disponibilizada.
- Alterações obrigatórias neste job: ${expectChanges ? "sim; implemente antes da resposta final" : "não especificado"}.
- Comandos exatos autorizados para este job: ${authorizedCommands.length ? JSON.stringify(authorizedCommands.map(({ id, description }) => ({ id, description }))) : "nenhum"}. Use somente run_authorized_command com um ID listado; não invente argumentos.
- Alterações só são permitidas quando a tarefa recebida as autorizar; preserve arquivos pessoais e dados existentes.
- Use obrigatoriamente as ferramentas fornecidas para estabelecer fatos sobre o repositório.
- Não confie em conhecimento prévio, nomes de projeto ou suposições.
- Toda afirmação factual específica sobre o repositório deve ser sustentada por evidência obtida nesta execução.
- Não imagine arquivos, arquitetura, dependências, comportamento, testes ou riscos.
- Não extrapole lacunas.
- Antes de concluir sobre um arquivo ou módulo, leia evidência suficiente.
- AGENTS.md aplicáveis aos caminhos acessados são entregues automaticamente pelas ferramentas e são obrigatórios.
- Instruções mais específicas de subdiretório prevalecem sobre as mais gerais dentro de seu escopo.
- Não afirme que teste/comando foi executado se não foi.
- Não execute rede.
- Não peça ao supervisor conteúdo que pode ser obtido pelas ferramentas.
- NEEDS_SUPERVISOR serve apenas para ambiguidade, conflito ou decisão intelectual/material que exija autoridade do supervisor.
- Falha de ferramenta, filesystem, Ollama ou ambiente é WORKER_INFRA_ERROR, nunca NEEDS_SUPERVISOR.
- Seja econômico na leitura: comece por árvore, manifestos, configurações e buscas direcionadas.
- Ao finalizar, seja conciso e forneça caminhos/linhas quando disponíveis.

FORMATO FINAL:

RESULTADO
...

EVIDÊNCIAS
...

RISCOS/LIMITAÇÕES
...

NEEDS_SUPERVISOR
...
`.trim();

  const messages = [
    {
      role: "system",
      content: system,
    },
    {
      role: "user",
      content: `
REPOSITÓRIO:
${repo}

PRÉ-INSPEÇÃO DETERMINÍSTICA:
${preScan.join("\n\n")}

TAREFA DELEGADA:
${task}

Inspecione de fato o repositório com as ferramentas antes de responder.
`.trim(),
    },
  ];

  const startedAt = Date.now();
  let toolExecutions = 0;
  let forcedInspection = false;
  let successfulMutations = 0;
  let forcedImplementation = false;

  for (let step = 0; step < MAX_STEPS; step++) {
    await onProgress({ phase: "step", step: step + 1 });
    const elapsed = Date.now() - startedAt;
    const remaining = TOTAL_TIMEOUT_MS - elapsed;

    if (remaining <= 0) {
      throw new Error("WORKER_INFRA_ERROR: timeout total do worker local.");
    }

    const availableTools = mode === "read-only"
      ? TOOL_DEFINITIONS.filter(tool => READ_ONLY_TOOLS.has(tool.function.name))
      : TOOL_DEFINITIONS.filter(tool => tool.function.name !== "run_authorized_command" || authorizedCommands.length);
    const response = await ollamaChat(messages, availableTools, remaining, onProgress);

    const message = response?.message;

    if (!message) {
      throw new Error(
        "WORKER_INFRA_ERROR: Ollama retornou resposta sem message.",
      );
    }

    const calls = Array.isArray(message.tool_calls) ? message.tool_calls : [];

    if (calls.length === 0) {
      const finalText = String(message.content ?? "").trim();

      // Impede resposta "de cabeça" sem examinar o repo.
      if (toolExecutions === 0 && !forcedInspection) {
        forcedInspection = true;

        messages.push(message);
        messages.push({
          role: "user",
          content:
            "Você ainda não inspecionou o repositório. Use as ferramentas fornecidas antes de formular qualquer conclusão factual.",
        });

        continue;
      }

      if (!finalText) {
        throw new Error(
          "WORKER_INFRA_ERROR: worker terminou sem resposta final.",
        );
      }

      if (expectChanges && successfulMutations === 0) {
        if (forcedImplementation) {
          throw new WorkerIncompleteError(`WORKER_INCOMPLETE: tarefa de escrita terminou sem alteração bem-sucedida. Última resposta: ${compact(finalText, 3000)}`);
        }
        forcedImplementation = true;
        messages.push(message);
        messages.push({ role: "user", content: "A tarefa exige implementação, mas nenhuma ferramenta de escrita foi concluída. Continue e aplique as alterações autorizadas. Se houver impedimento real, descreva-o precisamente em NEEDS_SUPERVISOR; uma resposta preparatória não conclui o job." });
        continue;
      }

      return compact(finalText, MAX_FINAL_CHARS);
    }

    messages.push(message);

    for (const call of calls) {
      await onProgress({ phase: "tool", step: step + 1, tool: call?.function?.name ?? "unknown" });
      let result;

      try {
        result = await executeTool(repo, call, deliveredInstructions, mode, authorizedCommands);

        toolExecutions++;
        if (new Set(["write_file", "edit_file", "move_file", "delete_file", "run_authorized_command"]).has(call?.function?.name)) successfulMutations++;
      } catch (error) {
        result =
          `${error instanceof ToolRejected ? "TOOL_REJECTED" : "WORKER_INFRA_ERROR"} na ferramenta ` +
          `${call?.function?.name ?? "desconhecida"}: ` +
          `${String(error?.message ?? error)}`;
      }

      messages.push({
        role: "tool",
        tool_name: call.function.name,
        content: compact(result),
      });
    }
  }

  throw new Error(`WORKER_INFRA_ERROR: limite de ${MAX_STEPS} ciclos agentivos atingido.`);
}
