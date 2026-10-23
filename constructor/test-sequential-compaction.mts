// S2Q: ensaio explícito no chat corrente; nunca agendado/instalado como runtime.
// Não repetir execução: o diretório exclusivo com recibos é a reserva permanente.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {codexCommand} from '../localworker/delivery.mjs';
import {atomicJson} from '../localworker/job-store.mjs';
import {captureContinuityU6C,observeContinuityU6C,callbackReasonU6C,latestContinuityTurnU6C} from '../localworker/continuity.mjs';
import {parseQueueReceipt,observeQueue,hasQueuedInputC9R} from '../supervisor/receipts.mts';

const args=process.argv.slice(2);
if(args.length!==6||args[0]!=='--confirm-live')throw Error('Uso: --confirm-live <thread> <repo> <codexHome> <promptFile> <runId>');
const [,threadId,repoInput,homeInput,promptInput,runId]=args;
if(!/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(threadId)||!/^s2q-[a-f0-9]{8}$/.test(runId))throw Error('INVALID_ID');
const repo=await fs.realpath(repoInput),home=await fs.realpath(homeInput);
if(repo.toLowerCase()!==(await fs.realpath(process.cwd())).toLowerCase())throw Error('TARGET_REPO_MISMATCH');
const privateRoot=path.join(repo,'constructor','audit-private');
const promptFile=await fs.realpath(promptInput);
if(!promptFile.toLowerCase().startsWith(privateRoot.toLowerCase()+path.sep))throw Error('PROMPT_NOT_PRIVATE_LOCAL');
const prompt=await fs.readFile(promptFile,'utf8');
if(!prompt.trim()||prompt.length>16000||prompt.trim()==='/compactar')throw Error('INVALID_EFFECTIVE_PROMPT');
const request={thread_id:threadId,repoPath:repo};
const config={codexHome:home,threadId};
const continuity=await captureContinuityU6C(request,home);
async function allowed(){
  const reason=callbackReasonU6C(continuity,await observeContinuityU6C(),latestContinuityTurnU6C(home,threadId,repo));
  if(reason)throw Error(reason);
}
await allowed();
if(hasQueuedInputC9R(config))throw Error('EXISTING_INPUT_HAS_PRECEDENCE');
const cli=await codexCommand();
const dir=path.join(privateRoot,runId);
await fs.mkdir(dir); // EEXIST: nunca repetir mensagens aceitas ou incertas.
const file=path.join(dir,'state.json');
const state:any={schema:1,run_id:runId,thread_id:threadId,repoPath:repo,created_at:new Date().toISOString(),
  status:'PREPARED',native_compaction:'UNPROVEN',continuity,
  prompt_sha256:createHash('sha256').update(prompt).digest('hex'),messages:[]};
const save=()=>atomicJson(file,state);
await save();
await fs.writeFile(path.join(dir,'effective-prompt.txt'),prompt,{flag:'wx'});
const run=promisify(execFile);
const observer=observeQueue(config);
async function send(kind:string,text:string){
  await allowed();
  const item:any={kind,text_sha256:createHash('sha256').update(text).digest('hex'),status:'SENDING',started_at:new Date().toISOString()};
  state.messages.push(item);await save(); // persistir antes do efeito não idempotente
  try{
    const {stdout}=await run(cli,['queue','-C',repo,'--thread',threadId,'--message',text],{
      windowsHide:true,cwd:repo,env:{...process.env,CODEX_HOME:home},timeout:30000,maxBuffer:8192});
    const queueId=parseQueueReceipt(stdout,threadId);
    if(!queueId)throw Error('QUEUE_RECEIPT_UNRECOGNIZED');
    Object.assign(item,{status:'QUEUED',queue_id:queueId,client_id:observer.messageClientId(queueId),accepted_at:new Date().toISOString()});
    await save();return item;
  }catch(error:any){
    item.status=error.code==='ENOENT'?'NOT_SENT':'AMBIGUOUS';item.error=error.code??'QUEUE_FAILED_OR_RECEIPT_UNRECOGNIZED';
    await save();throw Error(item.error);
  }
}
try{
  const first=await send('COMPACT_COMMAND','/compactar');
  // O intervalo é medido após recibo; não espera conclusão da compactação.
  await new Promise(resolve=>setTimeout(resolve,1000));
  const second=await send('EFFECTIVE_PROMPT',prompt);
  state.observed_gap_ms=Date.parse(second.started_at)-Date.parse(first.accepted_at);
  state.status='PAIR_QUEUED_NATIVE_UNPROVEN';await save();
  console.log(JSON.stringify({status:state.status,run_id:runId,queue_ids:state.messages.map((x:any)=>x.queue_id),observed_gap_ms:state.observed_gap_ms}));
}catch(error:any){
  state.status=state.messages.some((x:any)=>x.status==='SENDING'||x.status==='AMBIGUOUS')?'AMBIGUOUS_NO_RETRY':'INCOMPLETE_NO_RETRY';
  state.error=error.message;await save();console.error(JSON.stringify({status:state.status,run_id:runId,error:state.error}));process.exitCode=1;
}finally{observer.close();}
