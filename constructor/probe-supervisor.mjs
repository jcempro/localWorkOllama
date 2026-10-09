import { connect } from '../supervisor/rpc.mts';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
const home = process.env.CODEX_HOME || path.join(os.homedir(), '.codex');
const config = JSON.parse(await fs.readFile(path.join(os.homedir(), '.codex-local-worker', 'config.json'), 'utf8'));
const rpc = await connect({ codex: config.codex_command, codexHome: home });
try {
  const account = await rpc.read('account/read', { refreshToken: false });
  console.log(JSON.stringify({ authenticated: !!account.account, type: account.account?.type }));
  const limits = await rpc.read('account/rateLimits/read');
  console.log(JSON.stringify({ limits: limits.rateLimitsByLimitId ?? limits.rateLimits }));
  const thread = (await rpc.read('thread/read', { threadId: process.env.CODEX_THREAD_ID })).thread;
  console.log(JSON.stringify({ id: thread.id, cwd: thread.cwd, status: thread.status }));
  const turns = await rpc.read('thread/turns/list', { threadId: thread.id, limit: 2, itemsView: 'notLoaded' });
  console.log(JSON.stringify({ keys: Object.keys(turns), turns: turns.data.map(t => ({id:t.id,status:t.status,startedAt:t.startedAt,items:t.items.map(i=>({type:i.type,id:i.id,phase:i.phase,textLength:i.text?.length}))})) }));
  if(turns.data[1]){
    const last = await rpc.read('thread/items/list',{threadId:thread.id,turnId:turns.data[1].id,limit:2,sortDirection:'desc'});
    console.log(JSON.stringify({items:last.data.map(e=>({type:e.item.type,phase:e.item.phase,textLength:e.item.text?.length}))}));
  }
} finally { rpc.close(); }
