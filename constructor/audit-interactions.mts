// Auditoria interna: somente metadados e mensagens publicas relativas a jobs.
// Nunca consulta reasoning, ferramentas de negocio nem modifica chats/jobs.
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
const [inventoryPath, codexHome, outputPath]=process.argv.slice(2);
if(!inventoryPath||!codexHome||!outputPath)throw Error('Uso: audit-interactions.mts <inventory.json> <CODEX_HOME> <output.json>');
const inventory=JSON.parse(fs.readFileSync(inventoryPath,'utf8'));
const jobs=new Map(inventory.jobs.filter(j=>j.state?.status!=='CANCELLED').map(j=>[j.id,j]));
const history=new DatabaseSync(path.join(codexHome,'thread_history_1.sqlite'),{readOnly:true});
// Descoberta por chamadas reais inclui conversas bloqueadas antes de criar job.
const discovered=history.prepare("SELECT DISTINCT thread_id FROM thread_items WHERE item_type='mcpToolCall' AND lower(json_extract(item_json,'$.server'))='localworker'").all() as any[];
const threads=[...new Set([...jobs.values()].map(j=>j.request?.thread_id).concat(discovered.map(r=>r.thread_id)).filter(id=>/^[a-f0-9-]{36}$/i.test(id)))];
const cancelled=new Set(inventory.excluded.map(j=>j.id));
const result:any={schema:3,captured_at:new Date().toISOString(),source_capture:inventory.captured_at,jobs:[],threads:[],failed_starts:[],limitations:['Ausencia de registro nao prova ausencia historica; estados sao os da captura.','Resposta final do supervisor nao comprova por si so aceite semantico.','Texto de retomada identifica candidato a callback, nao prova por si so o mecanismo de envio.']};
try{
  const query=history.prepare("SELECT i.turn_id,i.item_id,i.item_json,t.status,t.error_json,t.started_at FROM thread_items i JOIN thread_turns t ON t.thread_id=i.thread_id AND t.turn_id=i.turn_id WHERE i.thread_id=? AND i.item_type IN ('mcpToolCall','userMessage','agentMessage') ORDER BY i.rollout_ordinal");
  const references=new Map<string,any[]>(),turnItems=new Map<string,any[]>();
  for(const thread of threads){
    let count=0;
    for(const row of query.iterate(thread) as any){
      const item=JSON.parse(row.item_json);
      // Chamadas + mensagens oficialmente visiveis; texto nao sai no relatorio.
      const material=item.type==='mcpToolCall'?JSON.stringify({arguments:item.arguments,result:item.result}):item.type==='userMessage'?JSON.stringify(item.content):item.text??'';
      const mentioned=material.match(/[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}/gi)??[];
      const ids=[...new Set(mentioned.filter(id=>jobs.has(id)))];
      if(!ids.length&&mentioned.some(id=>cancelled.has(id)))continue;
      const metadata={thread,turn:row.turn_id,item:row.item_id,type:item.type,tool:item.type==='mcpToolCall'?item.tool:null,
        phase:item.phase??null,tool_status:item.status??null,turn_status:row.status,
        error_kind:row.error_json?JSON.parse(row.error_json).codexErrorInfo??'unspecified':null,
        started_at:row.started_at,material_sha256:createHash('sha256').update(material).digest('hex')};
      if(item.type==='mcpToolCall'&&item.tool==='local_result'){
        let payload=item.result?.structuredContent;
        if(!payload)for(const entry of item.result?.content??[])if(entry.type==='text')try{payload=JSON.parse(entry.text);break;}catch{}
        metadata.terminal_result_obtained=item.status==='completed'&&['COMPLETED','FAILED','CANCELLED'].includes(payload?.status);
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
    const entries=references.get(id)??[],reads=entries.filter(e=>e.tool==='local_result'),callbacks=entries.filter(e=>e.callback_candidate);
    const linkedTurns=[...new Set(entries.map(e=>e.thread+':'+e.turn))].map(key=>{
      const items=turnItems.get(key)??[],first=items[0];
      return {thread:first.thread,id:first.turn,status:first.turn_status,error_kind:first.error_kind,public_items:items,
        final_response:items.some(e=>e.type==='agentMessage'&&['final_answer','final'].includes(e.phase))};
    });
    result.jobs.push({id,status:job.state.status,delivery:job.delivery.status??'UNAVAILABLE',
      references:entries,linked_turns:linkedTurns,local_result_calls:reads.length,terminal_results_obtained:reads.filter(e=>e.terminal_result_obtained).length,callback_turns:callbacks.map(e=>({id:e.turn,status:e.turn_status,error_kind:e.error_kind,
        final_response:linkedTurns.find(t=>t.id===e.turn&&t.thread===e.thread)?.final_response??false})),
      finding:reads.length>1?'MULTIPLE_RESULT_READS':callbacks.some(e=>e.error_kind==='usageLimitExceeded')?'SUPERVISOR_QUOTA_FAILURE':
        job.delivery.status==='QUEUED_TO_CHAT'&&!callbacks.length?'CALLBACK_EVIDENCE_NOT_FOUND':null});
  }
}finally{history.close();}
fs.writeFileSync(outputPath,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({jobs:result.jobs.length,threads:result.threads.length,failed_starts:result.failed_starts.length,diagnostics:result.failed_starts.reduce((a,j)=>(a[j.diagnostic]=(a[j.diagnostic]??0)+1,a),{}),findings:result.jobs.reduce((a,j)=>(j.finding&&(a[j.finding]=(a[j.finding]??0)+1),a),{})}));
