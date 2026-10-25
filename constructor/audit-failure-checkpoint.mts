// Projeção factual reutilizável de jobs congelados; sem inferência, replay ou aceite semântico.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const [capturePathK2F,captureHashK2F,...idsK2F]=process.argv.slice(2);
const shaK2F=(v:string|Buffer)=>createHash('sha256').update(v).digest('hex');
const UUID_K2F=/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/;
assert(idsK2F.length>0&&idsK2F.length<=8&&new Set(idsK2F).size===idsK2F.length&&idsK2F.every(id=>UUID_K2F.test(id)));
const bytes=fs.readFileSync(capturePathK2F);assert.equal(shaK2F(bytes),captureHashK2F);const capture=JSON.parse(bytes.toString('utf8'));
const phases=['tool_result','tool_error','tool_rejected','strategy_blocked','completion_verified','completion_blocked'];
const fields=['line','phase','step','tool','resource','outcome','progress','stagnant_actions','failure_class','reason','diagnostic','reads','commands','mutations','commits','commit_policy'];
const boundedK2F=(v:any):any=>typeof v==='string'?{text:v.slice(0,500),length:v.length,omitted_utf16:Math.max(0,v.length-500)}:Array.isArray(v)?v.map(boundedK2F):v;
const results=idsK2F.map(id=>{
 const matches=capture.jobs.filter((j:any)=>j.id===id);assert.equal(matches.length,1);const j=matches[0];assert.equal(j.state.status,'FAILED');
 const selected=j.events.filter((e:any)=>phases.includes(e.phase));
 assert(!j.events.some((e:any)=>e.parse_error),'K2F_EVENT_PARSE_ERROR');
 const counts=new Map<string,number>();for(const e of selected)if(e.phase==='tool_result'&&typeof e.resource==='string'&&e.resource){const key=JSON.stringify([e.tool,e.resource,e.outcome]);counts.set(key,(counts.get(key)??0)+1);}
 const error=j.error??'',footer=error.lastIndexOf('\nESTADO GIT DETERMINÍSTICO');assert(footer>=0);
 const request=j.request;assert(request&&typeof request.task==='string');
 return {id,status:j.state.status,error_kind:j.state.error_kind??null,
  request:{task_sha256:shaK2F(request.task),mode:request.mode,expect_changes:request.expect_changes,commit_policy:request.commit_policy,
   required_read_paths:request.required_read_paths??[],required_command_ids:request.required_command_ids??[],command_sequence:request.command_sequence??[],authorized_command_ids:(request.authorized_commands??[]).map((c:any)=>c.id)},
  state_observed:{steps:j.state.step,completed_tools:j.state.completed_tools,failed_tools:j.state.failed_tools,prompt_tokens_accumulated:j.state.prompt_tokens_observed,output_tokens_accumulated:j.state.output_tokens_observed,context_compactions:j.state.context_compactions,context_limit_tokens:j.state.context_limit_tokens??null},
  events:selected.map((e:any)=>Object.fromEntries(fields.filter(k=>e[k]!==undefined).map(k=>[k,boundedK2F(e[k])]))),events_omitted:j.events.length-selected.length,
  repeated_resources:[...counts].filter(([,n])=>n>1).map(([key,count])=>({tool_resource_outcome:JSON.parse(key),count})),
  error_body:boundedK2F(error.slice(0,footer)),error_sha256:shaK2F(error),git_footer_candidate:error.slice(footer+1).split('\n').slice(0,2)};
});
console.log('K2F_FAILURE_CHECKPOINT '+JSON.stringify({capture_sha256:captureHashK2F,results,
 limitations:'Projeção de eventos/estado/contrato congelados; recurso repetido não prova argumentos idênticos. Tokens acumulados não medem ocupação. Rodapé candidato textual não prova autoria/efeito. Sem inferência de risco, cognição, causa física ou aceite.',historical_commands_executed:false,model_inference:false,semantic_acceptance:'NOT_ASSESSED'}));
