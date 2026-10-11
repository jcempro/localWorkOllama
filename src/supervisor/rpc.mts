// Cliente somente de leitura do protocolo oficial; não inicia inferência.
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Reutiliza a descoberta do runtime instalado; a copia de recuperacao permite
// resolver o CLI mesmo quando o Worker ainda precisa ser restaurado.
export async function resolveCodex(config: any, load: any = async (file: string) => import(pathToFileURL(file).href)) {
  const usable=async(file: any)=>{
    if(typeof file!=='string'||!path.isAbsolute(file))return false;
    try{const stat=await fs.lstat(file);return stat.isFile()&&!stat.isSymbolicLink();}catch(error: any){if(error.code==='ENOENT')return false;throw error;}
  };
  if(await usable(config.codex))return config.codex;
  const sources=[path.join(config.workerHome,'delivery.mjs'),path.join(path.dirname(fileURLToPath(import.meta.url)),'worker-recovery','delivery.mjs')];
  const failures=[];
  for(const source of sources){
    try{const resolved=await (await load(source)).codexCommand();if(await usable(resolved))return resolved;failures.push('UNUSABLE_CLI');}
    catch(error: any){failures.push(error.code??'RESOLVER_UNAVAILABLE');}
  }
  throw new Error(`CODEX_CLI_UNAVAILABLE:${failures.join(',')}`);
}

export async function connect(config: any) {
  config.codex=await resolveCodex(config);
  const child = spawn(config.codex, ['app-server', '--stdio'], {
    windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, CODEX_HOME: config.codexHome },
  });
  let sequence = 0;
  const pending = new Map<number, any>();
  const fail = (error: Error) => { for (const item of pending.values()) { clearTimeout(item.timer); item.reject(error); } pending.clear(); };
  child.on('error', fail);
  child.on('exit', () => fail(new Error('APP_SERVER_CLOSED')));
  child.stderr.resume(); // Nunca persistir tokens/logs de autenticação.
  const lines = createInterface({ input: child.stdout });
  lines.on('line', line => {
    if (line.length > 16 * 1024 * 1024) { fail(new Error('RPC_RESPONSE_TOO_LARGE')); child.kill(); return; }
    let value: any; try { value = JSON.parse(line); } catch { return; }
    const item = pending.get(value.id);
    if (!item) return;
    pending.delete(value.id); clearTimeout(item.timer);
    if (value.error) item.reject(new Error(`RPC_${value.error.code}: ${String(value.error.message).slice(0, 500)}`));
    else item.resolve(value.result);
  });
  const read = (method: string, params: any = {}) => new Promise<any>((resolve, reject) => {
    if (!['initialize', 'account/read', 'account/rateLimits/read', 'thread/read', 'thread/turns/list', 'thread/items/list'].includes(method)) return reject(new Error('READ_ONLY_RPC'));
    const id = ++sequence;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`RPC_TIMEOUT:${method}`)); }, config.rpcTimeoutMs ?? 30_000);
    pending.set(id, { resolve, reject, timer });
    child.stdin.write(JSON.stringify({ id, method, params }) + '\n', error => { if (error) fail(error); });
  });
  const close = () => { fail(new Error('RPC_CLOSED')); lines.close(); child.stdin.end(); child.kill(); };
  try {
    await read('initialize', { clientInfo: { name: 'supervisor-resume', version: '1.0.0' }, capabilities: { experimentalApi: true } });
    child.stdin.write(JSON.stringify({ method: 'initialized' }) + '\n');
    return { read, close };
  } catch (error) { close(); throw error; }
}
