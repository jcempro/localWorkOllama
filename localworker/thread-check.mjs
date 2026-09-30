import { DatabaseSync } from "node:sqlite";
import os from "node:os";
import path from "node:path";

function normalizeDirectory(value) {
  return path.win32.normalize(String(value).replace(/^\\\\\?\\/, "")).replace(/[\\/]+$/, "").toLowerCase();
}

export function assertTargetThread(threadId, repoPath) {
  const codexHome = process.env.LOCAL_CODEX_HOME ?? process.env.CODEX_HOME ?? path.join(os.homedir(), ".codex");
  const database = new DatabaseSync(path.join(codexHome, "state_5.sqlite"), { readOnly: true });
  try {
    const thread = database.prepare("SELECT archived, cwd FROM threads WHERE id = ?").get(threadId);
    if (!thread) throw new Error("thread_id não encontrado no Codex Desktop; informe o ID da conversa que invoca o worker");
    if (thread.archived) throw new Error("thread_id pertence a uma conversa arquivada; informe o ID da conversa atual");
    if (normalizeDirectory(thread.cwd) !== normalizeDirectory(repoPath)) {
      throw new Error("thread_id pertence a conversa de outro diretório; informe o ID da conversa atual do repositório");
    }
  } finally {
    database.close();
  }
}
