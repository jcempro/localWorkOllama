import { promises as fs } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT_A3C = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MODE_A3C = process.argv[2] ?? '--check';
const START_A3C = '<!-- LOCALWORKER_GENERATED_START -->';
const END_A3C = '<!-- LOCALWORKER_GENERATED_END -->';
const RUNTIME_A3C = [
  'AGENTS.md', 'config.json', 'package.json', 'package-lock.json',
  'server.mjs', 'thread-check.mjs', 'job-store.mjs', 'worker-core.mjs',
  'worker-runner.mjs', 'delivery.mjs', 'watchdog.mjs', 'monitor.mjs', 'monitor-page.mjs', 'mcp-config.mjs', 'mcp-call.mjs', 'notify.ps1',
  'install.ps1', 'update-installed.ps1', 'register-watchdog.ps1',
];
const PRIVATE_A3C = [/C:\\auto-local/i, /C:\\Users\\admin/i, /D:\\trampo/i,
  /jeancarloem\.com\.blog/i, /<CAMINHO_REAL_DO_BLOG>/i];
const canonical = bytes => Buffer.from(bytes.toString('utf8').replace(/\r\n/g, '\n'), 'utf8');

if (!['--write', '--check'].includes(MODE_A3C)) throw new Error('Use --write ou --check');

async function putOrCompare(relative, bytes) {
  const target = path.join(ROOT_A3C, relative);
  const existing = await fs.readFile(target).catch(error => error?.code === 'ENOENT' ? null : Promise.reject(error));
  if (existing && canonical(existing).equals(canonical(bytes))) return;
  if (MODE_A3C === '--check') throw new Error(`Espelho divergente: ${relative}`);
  await fs.mkdir(path.dirname(target), { recursive: true });
  const temp = `${target}.${process.pid}.tmp`;
  try {
    await fs.writeFile(temp, bytes);
    await fs.rename(temp, target);
  } finally { await fs.rm(temp, { force: true }); }
}

async function updateBlock(relative, generated) {
  const target = path.join(ROOT_A3C, relative);
  const source = await fs.readFile(target, 'utf8');
  const begin = source.indexOf(START_A3C);
  const end = source.indexOf(END_A3C);
  if (begin < 0 || end <= begin || source.indexOf(START_A3C, begin + 1) >= 0) {
    throw new Error(`Marcadores gerados inválidos: ${relative}`);
  }
  const next = source.slice(0, begin + START_A3C.length) + '\n' + generated.trimEnd() + '\n' + source.slice(end);
  await putOrCompare(relative, Buffer.from(next, 'utf8'));
}

async function updateHowtoRules() {
  const relative = 'howto.md';
  const target = path.join(ROOT_A3C, relative);
  let source = await fs.readFile(target, 'utf8');
  for (const [heading, rulesFile] of [
    ['Conteúdo completo de AGENTS.md global', 'src/agents.supervisor.md'],
    ['Conteúdo completo de AGENTS.md do Worker', 'localworker/AGENTS.md'],
  ]) {
    const marker = `<summary>${heading}</summary>`;
    const start = source.indexOf(marker);
    if (start < 0 || source.indexOf(marker, start + 1) >= 0) throw new Error(`Bloco ausente/duplicado: ${heading}`);
    const fence = source.indexOf('```markdown', start);
    const close = source.indexOf('\n```', fence + 11);
    const detailsEnd = source.indexOf('</details>', close);
    if (fence < 0 || close < 0 || detailsEnd < 0) throw new Error(`Bloco inválido: ${heading}`);
    const text = (await fs.readFile(path.join(ROOT_A3C, rulesFile), 'utf8')).trimEnd();
    source = source.slice(0, fence + '```markdown'.length) + '\n' + text + source.slice(close);
  }
  await putOrCompare(relative, Buffer.from(source, 'utf8'));
}

async function walk(relative) {
  const full = path.join(ROOT_A3C, relative);
  const result = [];
  for (const item of await fs.readdir(full, { withFileTypes: true })) {
    const child = path.join(relative, item.name);
    if (item.isDirectory()) result.push(...await walk(child));
    else if (item.isFile()) result.push(child);
    else throw new Error(`Link/artefato não regular em src: ${child}`);
  }
  return result;
}

const inventory = [];
for (const name of RUNTIME_A3C) {
  const source = path.join(ROOT_A3C, 'localworker', name);
  const bytes = await fs.readFile(source);
  const target = `src/localworker/${name}`;
  await putOrCompare(target, bytes);
  if (name.endsWith('.mjs')) {
    const check = spawnSync(process.execPath, ['--check', source], { encoding: 'utf8' });
    if (check.status !== 0) throw new Error(`Sintaxe inválida em ${name}: ${check.stderr}`);
  }
  inventory.push({ target, sha256: createHash('sha256').update(canonical(bytes)).digest('hex') });
}
await putOrCompare('src/agents.worker.md', await fs.readFile(path.join(ROOT_A3C, 'localworker', 'AGENTS.md')));
await updateHowtoRules();
for (const file of ['src/install.ps1', 'src/agents.supervisor.md']) {
  const bytes = await fs.readFile(path.join(ROOT_A3C, file));
  inventory.push({ target: file, sha256: createHash('sha256').update(canonical(bytes)).digest('hex') });
}
const config = JSON.parse(await fs.readFile(path.join(ROOT_A3C, 'localworker', 'config.json'), 'utf8'));
const rows = inventory.map(({ target, sha256 }) => `| \`${target}\` | \`${sha256}\` |`).join('\n');
const generated = [
  'Gerado por `node scripts/sync-src.mjs --write` a partir dos artefatos testados. Os SHA-256 permitem conferir a distribuição sem caminhos locais.',
  '',
  `Configuração padrão: modelo \`${config.model}\`; Ollama \`${config.ollama_url}\`; \`timeout_ms=${config.timeout_ms}\` (${config.timeout_ms === 0 ? 'sem teto temporal total' : 'ms de teto total explícito'}); teto de ${config.max_steps} ciclos por job (configurável); ${config.ollama_attempts} tentativas transitórias.`,
  '',
  '| Artefato portável | SHA-256 |', '| --- | --- |', rows,
].join('\n');
for (const doc of ['RCF.md', 'howto.md', 'src/README.md']) await updateBlock(doc, generated);

for (const file of [...await walk('src'), 'howto.md']) {
  const value = await fs.readFile(path.join(ROOT_A3C, file), 'utf8');
  for (const pattern of PRIVATE_A3C) if (pattern.test(value)) throw new Error(`Valor exclusivo do desenvolvimento em ${file}: ${pattern}`);
}
console.log(`Espelhos e documentação ${MODE_A3C === '--write' ? 'atualizados' : 'consistentes'}: ${inventory.length} artefatos`);
