// Q8S: revisão declarada pelo supervisor; nunca avaliação automática do modelo.
import {promises as fs} from 'node:fs';
import path from 'node:path';
import {createHash,randomBytes,timingSafeEqual} from 'node:crypto';
import {ROOT,JOBS,jobDir,atomicJson} from './job-store.mjs';
import {withJobControl} from './job-control.mjs';

const FILE_Q8S='supervisor-review.json', MAX_RETURNS_Q8S=16, MAX_REVISIONS_Q8S=32;
const UUID_Q8S=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i, HASH_Q8S=/^[a-f0-9]{64}$/;
const hashQ8S=(v       )=>createHash('sha256').update(v).digest('hex');
const CACHE_MAX_Q8S=1000, snapshotCacheQ8S=new Map();





function supervisorQ8S(){if(process.env.LOCAL_WORKER_JOB_ID)throw Error('Q8S: atribuição/recibo reservados ao supervisor, não ao processo Worker');}
async function directoryQ8S(id       ){
  const dir=jobDir(id);
  for(const p of [ROOT,JOBS,dir]){
    const st=await fs.lstat(p);
    if(!st.isDirectory()||st.isSymbolicLink()||path.resolve(await fs.realpath(p)).toLowerCase()!==path.resolve(p).toLowerCase())
      throw Error('Q8S: diretório redirecionado ou inválido');
  }
  return dir;
}
async function fileQ8S(dir       ,name       ,optional=false)                {
  const p=path.join(dir,name);
  let st;try{st=await fs.lstat(p);}catch(e){if(optional&&e.code==='ENOENT')return '';throw e;}
  if(!st.isFile()||st.isSymbolicLink()||st.nlink!==1)throw Error('Q8S: arquivo não regular ou compartilhado');
  return fs.readFile(p,'utf8');
}
async function ledgerQ8S(dir       ,id       )                   {
  let raw       ;try{raw=await fileQ8S(dir,FILE_Q8S);}catch(e){if(e.code==='ENOENT')return {schema:1,job_id:id,receipts:[]};throw e;}
  const value=JSON.parse(raw);
  if(value.schema!==1||value.job_id!==id||!Array.isArray(value.receipts)||value.receipts.length>MAX_RETURNS_Q8S)
    throw Error('Q8S: registro de revisão inválido; preservado');
  const ids=new Set();
  for(const r of value.receipts){
    if(!HASH_Q8S.test(r.id)||ids.has(r.id)||!HASH_Q8S.test(r.token)||!['COMPLETED','FAILED'].includes(r.status)||
      ![r.request_sha256,r.result_sha256,r.final_sha256].every(x=>HASH_Q8S.test(x))||
      !['deterministic','inference'].includes(r.execution_kind)||!Number.isFinite(Date.parse(r.issued_at))||
      (r.legacy_source!==undefined&&(typeof r.legacy_source!=='string'||r.legacy_source.trim().length<12||r.legacy_source.length>512))||
      !Array.isArray(r.revisions)||r.revisions.length>MAX_REVISIONS_Q8S)throw Error('Q8S: recibo inválido; preservado');
    ids.add(r.id);
    for(const [i,g] of r.revisions.entries()){
      if(g.revision!==i+1||!Number.isInteger(g.score)||g.score<0||g.score>10||typeof g.reason!=='string'||g.reason.length>360||
        ((g.score<=3||g.score>=8)&&!g.reason.trim())||!UUID_Q8S.test(g.reviewer_thread_id)||!Number.isFinite(Date.parse(g.reviewed_at)))
        throw Error('Q8S: avaliação inválida; preservada');
    }
  }
  return value;
}
async function terminalQ8S(dir       ,id       ){
  const state=JSON.parse(await fileQ8S(dir,'state.json'));
  if(state.job_id!==id||!['COMPLETED','FAILED'].includes(state.status))throw Error('Q8S: somente retorno COMPLETED/FAILED; CANCELLED excluído');
  const rawRequest=await fileQ8S(dir,'request.json'), request=JSON.parse(rawRequest);
  const result=await fileQ8S(dir,state.status==='COMPLETED'?'result.md':'error.txt',true);
  const final=await fileQ8S(dir,'supervisor-final.md',true);
  const digest={job_id:id,status:state.status,error_kind:state.error_kind??null,
    request_sha256:hashQ8S(rawRequest),result_sha256:hashQ8S(result),final_sha256:hashQ8S(final)};
  return {state,result,final,digest,id:hashQ8S(JSON.stringify(digest)),
    execution_kind:request.command_sequence?.length?'deterministic':'inference'};
}

// Emissão antecede transporte: só o envio posterior review_complete confirma recebimento/exame declarados.
export async function issueReviewReceiptQ8S(id       ){
  supervisorQ8S();
  return withJobControl(id,async()=>{
    const dir=await directoryQ8S(id), t=await terminalQ8S(dir,id), ledger=await ledgerQ8S(dir,id);
    let receipt=ledger.receipts.find(r=>r.id===t.id);
    if(!receipt){
      if(ledger.receipts.length>=MAX_RETURNS_Q8S)throw Error('Q8S: limite de16 retornos; histórico preservado');
      receipt={id:t.id,token:randomBytes(32).toString('hex'),issued_at:new Date().toISOString(),status:t.state.status,
        request_sha256:t.digest.request_sha256,result_sha256:t.digest.result_sha256,final_sha256:t.digest.final_sha256,
        execution_kind:t.execution_kind,revisions:[]};
      ledger.receipts.push(receipt);await atomicJson(path.join(dir,FILE_Q8S),ledger);
    }
    return {result:t.result,supervisor_final:t.final,review:{receipt_id:receipt.id,receipt_token:receipt.token,
      revision:receipt.revisions.length,assessment:receipt.revisions.at(-1)??null,execution_kind:receipt.execution_kind}};
  });
}




export async function recordReviewQ8S(input               ){
  supervisorQ8S();
  const {job_id:id,expected_revision,review_complete,reviewer_thread_id,score,legacy_received:legacy}=input;
  let {receipt_id,receipt_token}=input;
  const reason=input.reason?.trim()??'';
  if((legacy?(receipt_id!==undefined||receipt_token!==undefined||expected_revision!==0||typeof legacy.source!=='string'||legacy.source.trim().length<12||legacy.source.length>512||
    !HASH_Q8S.test(legacy.result_sha256)||!HASH_Q8S.test(legacy.supervisor_final_sha256)||!['COMPLETED','FAILED'].includes(legacy.status)||
    (legacy.error_kind!==null&&typeof legacy.error_kind!=='string')):(!HASH_Q8S.test(receipt_id??'')||!HASH_Q8S.test(receipt_token??'')))||review_complete!==true||!UUID_Q8S.test(reviewer_thread_id)||
    !Number.isSafeInteger(expected_revision)||expected_revision<0||!Number.isInteger(score)||score<0||score>10||
    typeof reason!=='string'||reason.length>360||((score<=3||score>=8)&&!reason))throw Error('Q8S: revisão concluída, nota inteira0–10 e justificativa dos extremos exigidas');
  return withJobControl(id,async()=>{
    const dir=await directoryQ8S(id),t=await terminalQ8S(dir,id),ledger=await ledgerQ8S(dir,id);
    if(legacy){
      if(legacy.status!==t.state.status||legacy.error_kind!==(t.state.error_kind??null)||legacy.result_sha256!==t.digest.result_sha256||legacy.supervisor_final_sha256!==t.digest.final_sha256)
        throw Error('Q8S: recebimento legado diverge do retorno persistido; sem importação');
      const priorReceipt=ledger.receipts.find(r=>r.id===t.id),priorGrade=priorReceipt?.revisions.at(-1);
      if(ledger.receipts.length){
        if(ledger.receipts.length===1&&priorReceipt?.legacy_source===legacy.source.trim()&&priorGrade?.revision===1&&
          priorGrade.score===score&&priorGrade.reason===reason&&priorGrade.reviewer_thread_id===reviewer_thread_id)
          return {job_id:id,receipt_id:t.id,assessment:priorGrade,idempotent:true};
        throw Error('Q8S: job já possui registro; migração legada não altera revisão existente');
      }
      receipt_id=t.id;receipt_token=randomBytes(32).toString('hex');
      ledger.receipts.push({id:t.id,token:receipt_token,issued_at:new Date().toISOString(),status:t.state.status,
        request_sha256:t.digest.request_sha256,result_sha256:t.digest.result_sha256,final_sha256:t.digest.final_sha256,
        execution_kind:t.execution_kind,legacy_source:legacy.source.trim(),revisions:[]});
    }
    if(t.id!==receipt_id)throw Error('Q8S: retorno mudou; revisão obsoleta, sem nota aplicada');
    const receipt=ledger.receipts.find(r=>r.id===receipt_id);
    if(!receipt||!timingSafeEqual(Buffer.from(receipt.token,'hex'),Buffer.from(receipt_token??'','hex')))
      throw Error('Q8S: recibo de resultado não emitido ou credencial divergente');
    const prior=receipt.revisions.at(-1);
    // Retry após perda de resposta: só a mesma revisão exata, nunca desfaz uma revisão posterior.
    if(prior&&prior.revision===expected_revision+1&&prior.score===score&&prior.reason===reason&&prior.reviewer_thread_id===reviewer_thread_id)
      return {job_id:id,receipt_id,assessment:prior,idempotent:true};
    if(expected_revision!==receipt.revisions.length)throw Error('Q8S: revisão concorrente; confirme a versão atual antes de alterar');
    if(receipt.revisions.length>=MAX_REVISIONS_Q8S)throw Error('Q8S: limite de32 revisões; histórico preservado');
    const grade={revision:expected_revision+1,score,reason,reviewer_thread_id,reviewed_at:new Date().toISOString()};
    receipt.revisions.push(grade);await atomicJson(path.join(dir,FILE_Q8S),ledger);
    return {job_id:id,receipt_id,assessment:grade,idempotent:false};
  });
}

// Somente projeção pública: nunca expõe token nem escreve recibo/nota ao abrir o monitor.
export async function reviewSnapshotQ8S(id       ){
  try{
    const dir=await directoryQ8S(id);
    const signatures=await Promise.all([FILE_Q8S,'state.json','request.json','result.md','error.txt','supervisor-final.md'].map(async name=>{
      try{const s=await fs.lstat(path.join(dir,name));return [s.size,s.mtimeMs,s.ctimeMs,s.ino,s.isSymbolicLink(),s.nlink];}
      catch(e){if(e.code==='ENOENT')return null;throw e;}
    }));
    const signature=JSON.stringify(signatures),cached=snapshotCacheQ8S.get(id);
    if(cached?.signature===signature)return structuredClone(cached.value);
    const keep=value=>{snapshotCacheQ8S.delete(id);snapshotCacheQ8S.set(id,{signature,value});
      if(snapshotCacheQ8S.size>CACHE_MAX_Q8S)snapshotCacheQ8S.delete(snapshotCacheQ8S.keys().next().value);return structuredClone(value);};
    const ledger=await ledgerQ8S(dir,id);
    if(!ledger.receipts.length)return keep({status:'NOT_ASSESSED',assessment:null,history:[]});
    const t=await terminalQ8S(dir,id),current=ledger.receipts.find(r=>r.id===t.id),grade=current?.revisions.at(-1)??null;
    const history=ledger.receipts.flatMap(r=>r.revisions.map(g=>({...g,receipt_id:r.id,status:r.status,execution_kind:r.execution_kind})));
    return keep({status:grade?'ASSESSED':current?'NOT_ASSESSED':'STALE',receipt_id:current?.id??null,
      assessment:grade,execution_kind:t.execution_kind,history});
  }catch(e){snapshotCacheQ8S.delete(id);if(e.code==='ENOENT')return {status:'NOT_ASSESSED',assessment:null,history:[]};
    return {status:'UNAVAILABLE',assessment:null,history:[],error:String(e.message).slice(0,200)};}
}
