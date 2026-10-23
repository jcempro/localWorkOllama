// Auditoria interna: somente metadados e mensagens publicas relativas a jobs.
// Nunca consulta reasoning, ferramentas de negocio nem modifica chats/jobs.
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { resultAttributionA7R, resultReadCountsA7R } from './audit-result-attribution.mts';
const [inventoryPath, codexHome, outputPath, frozenPath]=process.argv.slice(2);
if(!inventoryPath||!codexHome||!outputPath)throw Error('Uso: audit-interactions.mts <inventory.json> <CODEX_HOME> <output.json> [interactions-congeladas.json]');
const inventory=JSON.parse(fs.readFileSync(inventoryPath,'utf8'));
// Quarto argumento opcional: reatribui somente itens da captura anterior.
// Não descobre turnos novos nem consulta resultados Worker novamente.
const frozen=frozenPath?JSON.parse(fs.readFileSync(frozenPath,'utf8')):null;
if(frozen&&(![3,4].includes(frozen.schema)||frozen.source_capture!==inventory.captured_at))throw Error('Captura congelada incompatível');
const expected=new Map<string,string>(), frozenMetadata=new Map<string,any>(),selected=new Map<string,Set<string>>(),seen=new Set<string>();
if(frozen){
  const retain=(e:any)=>{
    const key=JSON.stringify([e.thread,e.turn,e.item]);
    if(!e.thread||!e.turn||!e.item||!e.material_sha256)throw Error('Referência congelada inválida');
    if(expected.has(key)&&expected.get(key)!==e.material_sha256)throw Error('Hash conflitante na captura');
    expected.set(key,e.material_sha256);
    frozenMetadata.set(key,e);
    const ids=selected.get(e.thread)??new Set<string>();ids.add(e.item);selected.set(e.thread,ids);
  };
  for(const j of frozen.jobs){for(const e of j.references)retain(e);for(const t of j.linked_turns)for(const e of t.public_items)retain(e);}
  for(const f of frozen.failed_starts){retain(f);for(const e of f.public_turn_items)retain(e);}
}
const jobs=new Map(inventory.jobs.filter(j=>j.state?.status!=='CANCELLED').map(j=>[j.id,j]));
const history=new DatabaseSync(path.join(codexHome,'thread_history_1.sqlite'),{readOnly:true});
// Descoberta por chamadas reais inclui conversas bloqueadas antes de criar job.
const discovered=frozen?[]:history.prepare("SELECT DISTINCT thread_id FROM thread_items WHERE item_type='mcpToolCall' AND lower(json_extract(item_json,'$.server'))='localworker'").all() as any[];
const threads=frozen?frozen.threads.map(t=>t.thread):[...new Set([...jobs.values()].map(j=>j.request?.thread_id).concat(discovered.map(r=>r.thread_id)).filter(id=>/^[a-f0-9-]{36}$/i.test(id)))];
const cancelled=new Set(inventory.excluded.map(j=>j.id));
const result:any={schema:4,captured_at:new Date().toISOString(),source_capture:inventory.captured_at,
  reconciled_from:frozenPath?{sha256:createHash('sha256').update(fs.readFileSync(frozenPath)).digest('hex'),items:expected.size}:null,
  jobs:[],threads:[],failed_starts:[],limitations:['Ausencia de registro nao prova ausencia historica; estados sao os da captura.','Resposta final do supervisor nao comprova por si so aceite semantico.','Texto de retomada identifica candidato a callback, nao prova por si so o mecanismo de envio.','Menção textual não comprova consulta: contadores usam identidade explícita da chamada; resultado terminal exige resposta correspondente.']};
try{
  const query=history.prepare("SELECT i.turn_id,i.item_id,i.item_json,t.status,t.error_json,t.started_at FROM thread_items i JOIN thread_turns t ON t.thread_id=i.thread_id AND t.turn_id=i.turn_id WHERE i.thread_id=? AND i.item_type IN ('mcpToolCall','userMessage','agentMessage') AND (? IS NULL OR i.item_id IN (SELECT value FROM json_each(?))) ORDER BY i.rollout_ordinal");
  const references=new Map<string,any[]>(),turnItems=new Map<string,any[]>();
  for(const thread of threads){
    let count=0;
    const selection=frozen?JSON.stringify([...(selected.get(thread)??[])]):null;
    for(const row of query.iterate(thread,selection,selection) as any){
      const item=JSON.parse(row.item_json);
      // Chamadas + mensagens oficialmente visiveis; texto nao sai no relatorio.
      const material=item.type==='mcpToolCall'?JSON.stringify({arguments:item.arguments,result:item.result}):item.type==='userMessage'?JSON.stringify(item.content):item.text??'';
      const materialHash=createHash('sha256').update(material).digest('hex'),frozenKey=JSON.stringify([thread,row.turn_id,row.item_id]);
      if(frozen){if(expected.get(frozenKey)!==materialHash)throw Error('Item ausente/divergente da captura congelada');seen.add(frozenKey);}
      const mentioned=(material.match(/[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}/gi)??[]).map(id=>id.toLowerCase());
      const ids=[...new Set(mentioned.filter(id=>jobs.has(id)))];
      if(!ids.length&&mentioned.some(id=>cancelled.has(id)))continue;
      const metadata={thread,turn:row.turn_id,item:row.item_id,type:item.type,tool:item.type==='mcpToolCall'?item.tool:null,
        phase:item.phase??null,tool_status:item.status??null,turn_status:row.status,
        error_kind:row.error_json?JSON.parse(row.error_json).codexErrorInfo??'unspecified':null,
        started_at:row.started_at,material_sha256:materialHash,...resultAttributionA7R(item)};
      if(frozen){
        const old=frozenMetadata.get(frozenKey);
        for(const field of ['type','tool','phase','tool_status'])if(metadata[field]!==old[field])throw Error('Identidade/estado do item congelado divergente');
        // Um turno pode terminar depois da captura; não reescrever seu estado histórico.
        for(const field of ['turn_status','error_kind','started_at'])metadata[field]=old[field];
      }
      const key=thread+':'+row.turn_id,publicItems=turnItems.get(key)??[];
      publicItems.push(metadata);turnItems.set(key,publicItems);
      if(item.type==='mcpToolCall'&&String(item.server).toLowerCase()==='localworker'&&['local_analyze','local_start'].includes(item.tool)&&item.status==='failed'){
        const response=JSON.stringify({result:item.result,error:item.error});
        const classification=response.includes('Automatic approval review failed')?'SUPERVISOR_APPROVAL_REVIEW_LIMIT':response.includes('Input validation error')?'REQUEST_VALIDATION_ERROR':response.includes('WORKER_INFRA_ERROR')?'WORKER_INFRA_ERROR':response.includes('NEEDS_SUPERVISOR')?'NEEDS_SUPERVISOR':'WORKER_TRANSPORT_ERROR';
        const nul=/\\u0000|\x00/i.test(response);
        const diagnostic=nul?'NUL_JSON':response.includes('job_id inválido')?'EMPTY_INDEX_LEGACY_MCP':response.includes('<=240')?'DESCRIPTION_TOO_LONG':response.includes('caminho absoluto')?'ABSOLUTE_PROGRAM_REQUIRED':response.includes('40 ciclos')?'LEGACY_CYCLE_BUDGET':response.includes('after 300s')?'LEGACY_SYNC_TIMEOUT':response.includes('Transport closed')?'TRANSPORT_CLOSED':classification==='SUPERVISOR_APPROVAL_REVIEW_LIMIT'?'QUOTA_REVIEW_NOT_EXECUTED':'SEE_PRIVATE_SOURCE';
        result.failed_starts.push({...metadata,classification,diagnostic,response_sha256:createHash('sha256').update(response).digest('hex')});
      }
      for(const id of ids){
        const entries=references.get(id)??[];
        entries.push({...metadata,callback_candidate:item.type==='userMessage'&&material.includes('O localWorker do job '+id)});
        references.set(id,entries);count++;
      }
    }
    result.threads.push({thread,references:count});
  }
  for(const failure of result.failed_starts){
    failure.public_turn_items=turnItems.get(failure.thread+':'+failure.turn)??[];
    failure.final_response=failure.public_turn_items.some(e=>e.type==='agentMessage'&&['final_answer','final'].includes(e.phase));
  }
  for(const [id,job] of jobs){
    const entries=references.get(id)??[],counts=resultReadCountsA7R(entries,id),callbacks=entries.filter(e=>e.callback_candidate);
    const linkedTurns=[...new Set(entries.map(e=>e.thread+':'+e.turn))].map(key=>{
      const items=turnItems.get(key)??[],first=items[0];
      return {thread:first.thread,id:first.turn,status:first.turn_status,error_kind:first.error_kind,public_items:items,
        final_response:items.some(e=>e.type==='agentMessage'&&['final_answer','final'].includes(e.phase))};
    });
    result.jobs.push({id,status:job.state.status,delivery:job.delivery.status??'UNAVAILABLE',
      references:entries,linked_turns:linkedTurns,...counts,callback_turns:callbacks.map(e=>({id:e.turn,status:e.turn_status,error_kind:e.error_kind,
        final_response:linkedTurns.find(t=>t.id===e.turn&&t.thread===e.thread)?.final_response??false})),
      finding:counts.local_result_calls>1?'MULTIPLE_RESULT_READS':callbacks.some(e=>e.error_kind==='usageLimitExceeded')?'SUPERVISOR_QUOTA_FAILURE':
        job.delivery.status==='QUEUED_TO_CHAT'&&!callbacks.length?'CALLBACK_EVIDENCE_NOT_FOUND':null});
  }
  if(frozen&&seen.size!==expected.size)throw Error('Itens congelados faltantes; reconciliação incompleta');
}finally{history.close();}
fs.writeFileSync(outputPath,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({jobs:result.jobs.length,threads:result.threads.length,failed_starts:result.failed_starts.length,diagnostics:result.failed_starts.reduce((a,j)=>(a[j.diagnostic]=(a[j.diagnostic]??0)+1,a),{}),findings:result.jobs.reduce((a,j)=>(j.finding&&(a[j.finding]=(a[j.finding]??0)+1),a),{})}));
