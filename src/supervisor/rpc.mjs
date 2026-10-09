// Cliente somente de leitura do protocolo oficial; não inicia inferência.
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';

export async function connect(config     ) {
  const child = spawn(config.codex, ['app-server', '--stdio'], {
    windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, CODEX_HOME: config.codexHome },
  });
  let sequence = 0;
  const pending = new Map             ();
  const fail = (error       ) => { for (const item of pending.values()) { clearTimeout(item.timer); item.reject(error); } pending.clear(); };
  child.on('error', fail);
  child.on('exit', () => fail(new Error('APP_SERVER_CLOSED')));
  child.stderr.resume(); // Nunca persistir tokens/logs de autenticação.
  const lines = createInterface({ input: child.stdout });
  lines.on('line', line => {
    if (line.length > 16 * 1024 * 1024) { fail(new Error('RPC_RESPONSE_TOO_LARGE')); child.kill(); return; }
    let value     ; try { value = JSON.parse(line); } catch { return; }
    const item = pending.get(value.id);
    if (!item) return;
    pending.delete(value.id); clearTimeout(item.timer);
    if (value.error) item.reject(new Error(`RPC_${value.error.code}: ${String(value.error.message).slice(0, 500)}`));
    else item.resolve(value.result);
  });
  const read = (method        , params      = {}) => new Promise     ((resolve, reject) => {
    if (!['initialize', 'account/read', 'account/rateLimits/read', 'thread/read', 'thread/turns/list'].includes(method)) return reject(new Error('READ_ONLY_RPC'));
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
