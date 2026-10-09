import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { connect } from './rpc.mjs';
import { planCycles, advance, digest, responseEvidence } from './core.mjs';
import { observeQueue, parseQueueReceipt, persistedTurn, correlatedTurn } from './receipts.mjs';

const ROOT_S8R = path.dirname(fileURLToPath(import.meta.url));
const readJson = async (p        ) => JSON.parse((await fs.readFile(p, 'utf8')).replace(/^\uFEFF/, ''));
export async function atomic(file        , value     ) {
  const tmp = `${file}.${process.pid}.tmp`;
  const handle = await fs.open(tmp, 'w');
  try { await handle.writeFile(JSON.stringify(value, null, 2) + '\n'); await handle.sync(); } finally { await handle.close(); }
  await fs.rename(tmp, file);
}
async function command(exe        , args          , config     , timeout = 30_000) {
  return new Promise        ((resolve, reject) => {
    const child = spawn(exe, args, { windowsHide: true, cwd: config.repoPath, env: { ...process.env, CODEX_HOME: config.codexHome }, stdio: ['ignore','pipe','pipe'] });
    let output = ''; child.stdout.on('data', c => { output = (output + c).slice(-16000); }); child.stderr.resume();
    const timer = setTimeout(() => { child.kill(); reject(new Error('PROCESS_TIMEOUT')); }, timeout);
    child.on('error', e => { clearTimeout(timer); reject(e); });
    child.on('exit', code => { clearTimeout(timer); code === 0 ? resolve(output.trim()) : reject(new Error(`PROCESS_EXIT_${code}:${path.basename(exe)}`)); });
  });
}
const platform = (config     , action        , extra           = []) => command(config.powershell, ['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',path.join(ROOT_S8R,'platform.ps1'),'-Action',action,'-Config',path.join(ROOT_S8R,'config.json'),...extra], config, 90_000);
async function safeRoot(dir        ) {
  const actual = await fs.realpath(dir);
  if (path.resolve(actual).toLowerCase() !== path.resolve(dir).toLowerCase()) throw new Error('REDIRECTED_ROOT');
  const info = await fs.lstat(dir); if (!info.isDirectory() || info.isSymbolicLink()) throw new Error('UNSAFE_ROOT');
}
function assertThread(config     ) {
  const db = new DatabaseSync(path.join(config.codexHome, 'state_5.sqlite'), {readOnly:true});
  try {
    const row      = db.prepare('SELECT cwd, archived FROM threads WHERE id = ?').get(config.threadId);
    const normalize = (p        ) => path.resolve(p.replace(/^\\\\\?\\/, '')).toLowerCase();
    if (!row || row.archived || normalize(row.cwd) !== normalize(config.repoPath)) throw new Error('THREAD_TARGET_MISMATCH_OR_ARCHIVED');
  } finally { db.close(); }
}
async function repairWorker(config     ) {
  const manifest = await readJson(path.join(ROOT_S8R,'worker-recovery','manifest.json'));
  await fs.mkdir(config.workerHome, { recursive: true }); await safeRoot(config.workerHome);
  for (const entry of manifest.files) {
    if (!/^[\w.-]+$/.test(entry.name)) throw new Error('INVALID_RECOVERY_MANIFEST');
    const dst = path.join(config.workerHome,entry.name);
    const present = await fs.lstat(dst).catch((e     ) => {if(e.code==='ENOENT')return null;throw e;});
    if (present) { if (!present.isFile() || present.isSymbolicLink() || present.nlink !== 1) throw new Error('UNSAFE_WORKER_FILE'); continue; }
    const bytes = await fs.readFile(path.join(ROOT_S8R,'worker-recovery',entry.name));
    if (createHash('sha256').update(bytes).digest('hex') !== entry.sha256) throw new Error('RECOVERY_HASH_MISMATCH');
    await fs.writeFile(dst,bytes,{flag:'wx'});
  }
  // Dependências ausentes são restauradas pelo lockfile, sem scripts de pacote.
  if (!await fs.stat(path.join(config.workerHome,'node_modules','@modelcontextprotocol','server')).catch(()=>null)) await platform(config,'WorkerDependencies');
  await platform(config,'Ollama');
  const workerConfig = await readJson(path.join(config.workerHome,'config.json'));
  const endpoint = new URL(workerConfig.ollama_url);
  if (!['127.0.0.1','localhost','[::1]'].includes(endpoint.hostname)) throw new Error('NONLOCAL_OLLAMA_REQUIRES_EXPLICIT_ADAPTER');
  const tags = await fetch(new URL('/api/tags',endpoint),{signal:AbortSignal.timeout(10_000)}).then(r=>{if(!r.ok)throw new Error('OLLAMA_HTTP');return r.json();})       ;
  if (!tags.models?.some((m     )=>m.name===workerConfig.model || m.name===`${workerConfig.model}:latest`)) throw new Error('WORKER_MODEL_MISSING_REINSTALL_REQUIRED');
  const registration = await import(pathToFileURL(path.join(config.workerHome,'mcp-config.mjs')).href);
  await registration.ensureMcpRegistration({configPath:path.join(config.codexHome,'config.toml'),command:config.codex});
  const bridge = await import(pathToFileURL(path.join(config.workerHome,'mcp-call.mjs')).href);
  await bridge.callLocalWorker({name:'local_monitor',args:{},serverPath:path.join(config.workerHome,'server.mjs'),env:{...process.env,CODEX_HOME:config.codexHome}});
}

async function main() {
  if (process.argv.includes('--help')) { console.log('Executar via platform.ps1 -Action Tick -Config <config.json>; --probe é somente prontidão; --test-event agenda teste real autorizado sem alterar a cota.'); return; }
  const config = await readJson(path.join(ROOT_S8R,'config.json'));
  if (config.schema !== 1 || !/^[\da-f-]{36}$/i.test(config.threadId)) throw new Error('INVALID_CONFIG');
  if (!process.argv.includes('--probe') && process.env.SUPERVISOR_MUTEX_S8R !== config.mutexName) throw new Error('USE_CANONICAL_MUTEX_LAUNCHER');
  await safeRoot(ROOT_S8R); await safeRoot(config.repoPath); assertThread(config);
  await fs.mkdir(path.join(ROOT_S8R,'events'),{recursive:true}); await safeRoot(path.join(ROOT_S8R,'events'));
  // Confirmacao local independe da API/rede e do backoff de recuperacao.
  // Nao existe efeito de envio neste caminho; prova exige clientId exato.
  if(!process.argv.includes('--probe'))for(const name of await fs.readdir(path.join(ROOT_S8R,'events'))){
    if(!/^[a-f0-9]{64}\.json$/.test(name))continue;
    const file=path.join(ROOT_S8R,'events',name);const stat=await fs.lstat(file);
    if(!stat.isFile()||stat.isSymbolicLink()||stat.nlink!==1)throw new Error('UNSAFE_EVENT');
    const event=await readJson(file);
    if(event.status==='COMPLETED'||!event.messageClientId)continue;
    if(event.id!==name.slice(0,-5)||event.target.threadId!==config.threadId||event.target.repoPath!==config.repoPath||event.target.accountKey!==config.accountKey)throw new Error('EVENT_TARGET_MISMATCH');
    const turn=correlatedTurn(config,event.messageClientId);
    if(turn){
      const evidence=responseEvidence(event,[turn]);
      if(['RECEIVED','COMPLETED'].includes(evidence.status))await atomic(file,{...event,...evidence,updatedAt:Date.now(),confirmationSource:'persisted-client-id'});
    }
  }
  const rpc = await connect(config);
  try {
    const account = await rpc.read('account/read',{refreshToken:true});
    if (account.account?.type !== 'chatgpt') throw new Error('CHATGPT_LOGIN_REQUIRED');
    const accountKey = digest(account.account);
    if (accountKey !== config.accountKey) throw new Error('ACCOUNT_CHANGED');
    const target = {threadId:config.threadId,repoPath:config.repoPath,accountKey};
    const io = {
      now:Date.now, save: (e     )=>atomic(path.join(ROOT_S8R,'events',`${e.id}.json`),e),
      identity:async(t     )=>{if(JSON.stringify(t)!==JSON.stringify(target))throw new Error('TARGET_CHANGED');assertThread(config);},
      quota:()=>rpc.read('account/rateLimits/read'),
      reconcileReceipt:async(event     )=>{
        const queueId=event.queueId??parseQueueReceipt(event.acknowledgement??'',config.threadId);
        if(!queueId)return null;
        const observer=observeQueue(config);
        try{return {queueId,messageClientId:observer.messageClientId(queueId)};}finally{observer.close();}
      },
      recoverDesktop:()=>platform(config,'Desktop'),
      ready:async()=>{await platform(config,'Desktop');await repairWorker(config);},
      turns:async(_target     ,event      )=>{
        const response=await rpc.read('thread/turns/list',{threadId:config.threadId,limit:20,sortDirection:'desc',itemsView:'notLoaded'});
        if(event){
          for(const turn of response.data){
            if(event.baselineTurns.includes(turn.id)||turn.startedAt*1000<event.sendStartedAt-1000)continue;
            // A projecao persistida preserva inProgress: app-server separado pode apresentar interrupted.
            const persisted=persistedTurn(config,turn.id);
            if(persisted){Object.assign(turn,persisted);continue;}
            // Somente bordas do turno: solicitacao recebida e resposta final; sem carregar tools/raciocinio.
            const first=await rpc.read('thread/items/list',{threadId:config.threadId,turnId:turn.id,limit:2,sortDirection:'asc'});
            const last=await rpc.read('thread/items/list',{threadId:config.threadId,turnId:turn.id,limit:2,sortDirection:'desc'});
            turn.items=[...first.data,...last.data].map((entry     )=>entry.item);
          }
        }
        return response.data;
      },
      send:async(_t     ,text        )=>{
        const observer=observeQueue(config);
        try {
          const output=await command(config.codex,['queue','-C',config.repoPath,'--thread',config.threadId,'--message',text],config);
          // Só aceitar ID explícito do recibo, nunca UUID do próprio thread.
          let receipt     ;try{receipt=JSON.parse(output);}catch{}
          const queueId=parseQueueReceipt(output,config.threadId);
          return {messageId:receipt?.messageId??null,messageClientId:receipt?.clientUserMessageId??(queueId?observer.messageClientId(queueId):null),queueId,acknowledgement:output.slice(0,500)};
        }catch(error     ){if(error.code==='ENOENT')error.code='SEND_NOT_STARTED';throw error;}finally{observer.close();}
      },
    };
    if(process.argv.includes('--probe')){await io.ready();console.log(JSON.stringify({status:'READY',threadId:config.threadId,auth:'chatgpt',worker:'MCP_AND_MODEL_READY'}));return;}
    const now=Date.now();
    let discoveryError               =null;
    let detected       =[];
    const priorNames=(await fs.readdir(path.join(ROOT_S8R,'events'))).filter(n=>/^[a-f0-9]{64}\.json$/.test(n));
    const existing=await Promise.all(priorNames.map(async n=>{
      const file=path.join(ROOT_S8R,'events',n);const stat=await fs.lstat(file);
      if(!stat.isFile()||stat.isSymbolicLink()||stat.nlink!==1)throw new Error('UNSAFE_EVENT');
      return readJson(file);
    }));
    const ledgerPath=path.join(ROOT_S8R,'cycles.json');
    const ledger=await readJson(ledgerPath).catch((error     )=>{if(error.code==='ENOENT')return {schema:1,windows:{}};throw error;});
    try { detected=planCycles(await io.quota(),target,ledger,existing,now); } catch(error     ) { discoveryError=String(error.message).slice(0,300); }
    if(process.argv.includes('--test-event')) {
      const testId=process.argv.find(v=>v.startsWith('--test-id='))?.slice(10)??'installation-test';
      if(!/^[a-z0-9-]{1,64}$/.test(testId))throw new Error('INVALID_TEST_ID');
      detected.push({schema:1,id:digest([target,testId]),target,window:{test:true,testId},dueAt:Math.ceil(now/1000)*1000+60_000,detectedAt:now,status:'SCHEDULED',attempts:0});
    }
    const eventNames=await fs.readdir(path.join(ROOT_S8R,'events'));
    if(eventNames.filter(n=>/^[a-f0-9]{64}\.json$/.test(n)).length>=512){detected=[];discoveryError='EVENT_RETENTION_CAP_REQUIRES_REVIEW';}
    for(const event of detected){
      const file=path.join(ROOT_S8R,'events',`${event.id}.json`);
      const previous=existing.find(e=>e.id===event.id);
      if(!previous||(!previous.sendStartedAt&&event.dueAt!==previous.dueAt))await io.save(event);
    }
    await atomic(ledgerPath,ledger); // Evento existe antes da referencia persistida.
    const summary=[];
    for(const name of await fs.readdir(path.join(ROOT_S8R,'events'))){
      if(!/^[a-f0-9]{64}\.json$/.test(name))continue;
      const file=path.join(ROOT_S8R,'events',name);
      const stat=await fs.lstat(file);if(!stat.isFile()||stat.isSymbolicLink()||stat.nlink!==1)throw new Error('UNSAFE_EVENT');
      const event=await readJson(file); if(name!==`${event.id}.json`)throw new Error('EVENT_ID_MISMATCH');
      await advance(event,io,now);
      summary.push({id:event.id,status:event.status,dueAt:event.dueAt,nextAttemptAt:event.nextAttemptAt??null});
      if(event.status!=='COMPLETED')await platform(config,'Schedule',['-EventId',event.id,'-DueAt',String(Math.max(event.dueAt,event.nextAttemptAt??0))]);
      else {
        await platform(config,'Unschedule',['-EventId',event.id]);
        if(now-(event.updatedAt??event.dueAt)>90*86400_000)await fs.unlink(file);
      }
    }
    await atomic(path.join(ROOT_S8R,'status.json'),{schema:1,status:discoveryError?'TELEMETRY_RETRY':'MONITORING',checkedAt:now,diagnostic:discoveryError,events:summary});
    console.log(JSON.stringify({status:'MONITORING',events:summary.length}));
  }finally{rpc.close();}
}
main().catch(async(error     )=>{
  // Diagnóstico sem stderr externo, credenciais ou histórico de conversa.
  const message=String(error.message).replace(/Bearer\s+\S+/gi,'Bearer [redacted]').slice(0,600);
  await atomic(path.join(ROOT_S8R,'status.json'),{schema:1,status:'RECOVERY_PENDING',checkedAt:Date.now(),diagnostic:message}).catch(()=>{});
  console.error(message);process.exitCode=3;
});
