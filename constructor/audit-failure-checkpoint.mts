// Projeção factual reutilizável de jobs congelados; sem inferência, replay ou aceite semântico.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const argvK2F=process.argv.slice(2),retainedK2F=argvK2F[0]==='--retained',compactK2F=retainedK2F||argvK2F[0]==='--compact';
const inputK2F=compactK2F?argvK2F.slice(1):argvK2F;
const [capturePathK2F,captureHashK2F,...idsK2F]=inputK2F;
const shaK2F=(v:string|Buffer)=>createHash('sha256').update(v).digest('hex');
const UUID_K2F=/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/;
const MAX_COMPACT_CHARS_K2F=8000; // Margem sobre MAX_FINAL_CHARS16000 do runtime, sem truncar evidência.
if(retainedK2F)assert(inputK2F.length===3&&/^[a-f0-9]{64}$/.test(idsK2F[0]));
else assert(idsK2F.length>0&&idsK2F.length<=8&&new Set(idsK2F).size===idsK2F.length&&idsK2F.every(id=>UUID_K2F.test(id)));
const bytes=fs.readFileSync(capturePathK2F);assert.equal(shaK2F(bytes),captureHashK2F);
let payloadK2F:any,retainedOriginK2F:any=null;
if(retainedK2F){
 assert.equal(inputK2F.length,3);const saved=JSON.parse(bytes.toString('utf8'));assert(UUID_K2F.test(saved.job_id));assert.equal(saved.rejections.length,1);
 const candidate=saved.rejections[0];assert.equal(candidate.truncated,false);assert.equal(candidate.candidate.length,candidate.candidate_chars);assert.equal(shaK2F(candidate.candidate),candidate.candidate_sha256);assert.equal(candidate.candidate_sha256,idsK2F[0]);
 const lines=candidate.candidate.split('\n').filter((s:string)=>s.startsWith('K2F_FAILURE_CHECKPOINT '));assert.equal(lines.length,1);
 assert(candidate.candidate.startsWith('RESULTADO DETERMINÍSTICO\nComando checkpoint_failures; exit_code=0\nstdout:\n'));
 payloadK2F=JSON.parse(lines[0].slice('K2F_FAILURE_CHECKPOINT '.length));
 retainedOriginK2F={source_job:saved.job_id,artifact_sha256:captureHashK2F,candidate_sha256:candidate.candidate_sha256,extraction_repeated:false};
}else{
const capture=JSON.parse(bytes.toString('utf8'));
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
payloadK2F={capture_sha256:captureHashK2F,results,
 limitations:'Projeção de eventos/estado/contrato congelados; recurso repetido não prova argumentos idênticos. Tokens acumulados não medem ocupação. Rodapé candidato textual não prova autoria/efeito. Sem inferência de risco, cognição, causa física ou aceite.',historical_commands_executed:false,model_inference:false,semantic_acceptance:'NOT_ASSESSED'};
}
if(!compactK2F)console.log('K2F_FAILURE_CHECKPOINT '+JSON.stringify(payloadK2F));
else{
 assert(/^[a-f0-9]{64}$/.test(payloadK2F.capture_sha256));assert(payloadK2F.results.length>0&&payloadK2F.results.length<=8);
 const textK2F=(v:any)=>typeof v==='string'?v:v?.text;
 const commandIdK2F=(s:any)=>typeof s==='string'&&/^[a-z0-9][a-z0-9_-]{0,63}$/i.test(s);
 const records=payloadK2F.results.map((r:any)=>{
  assert(UUID_K2F.test(r.id));assert.equal(r.status,'FAILED');assert(r.request.required_command_ids.every(commandIdK2F));
  const events=r.events,counts={ok:0,error:0,rejected:0,other:0};let readsOk=0,writesOk=0,editsOk=0,movesOk=0,deletesOk=0;
  const attempts:any[]=[],pending:any[]=[];
  for(const e of events){const phase=textK2F(e.phase),tool=textK2F(e.tool),outcome=textK2F(e.outcome),diagnostic=textK2F(e.diagnostic);
   if(phase==='tool_result'){
    if(outcome==='ok'||outcome==='error'||outcome==='rejected')counts[outcome]++;else counts.other++;
    if(tool==='read_file'&&outcome==='ok')readsOk++;if(tool==='write_file'&&outcome==='ok')writesOk++;
    if(tool==='edit_file'&&outcome==='ok')editsOk++;if(tool==='move_file'&&outcome==='ok')movesOk++;if(tool==='delete_file'&&outcome==='ok')deletesOk++;
    if(tool==='run_authorized_command'){const match=typeof diagnostic==='string'?/^comando ([a-z0-9_-]+): falha ([0-9]+);/i.exec(diagnostic):null;
     attempts.push({line:e.line,id:match?.[1]??null,exit_code:match?Number(match[2]):null,outcome:outcome==='ok'||outcome==='error'||outcome==='rejected'?outcome:null});}
   }
   if(phase==='completion_blocked'){const reason=textK2F(e.reason),marker='comandos pendentes=';const n=typeof reason==='string'?reason.indexOf(marker):-1;
    const truncated=Boolean(e.reason?.omitted_utf16);let ids:any=null,status=truncated?'truncated':'marker_absent';
    if(!truncated&&n>=0){try{const parsed=JSON.parse(reason.slice(n+marker.length));if(Array.isArray(parsed)&&parsed.every(commandIdK2F)){ids=parsed;status='recognized';}else status='invalid_shape';}catch{status='unrecognized';}}
    pending.push({line:e.line,ids,reason_status:status});}
  }
  return {id:r.id,row_sha256:shaK2F(JSON.stringify(r)),required_commands:r.request.required_command_ids,command_attempts:attempts,completion_blocked:pending,
   tool_outcomes:counts,reads_ok:readsOk,writes_ok:writesOk,write_file_ok:writesOk,edit_file_ok:editsOk,move_file_ok:movesOk,delete_file_ok:deletesOk,direct_file_mutations_ok:writesOk+editsOk+movesOk+deletesOk,repeated_resource_groups:r.repeated_resources.length,steps:r.state_observed.steps,context_compactions:r.state_observed.context_compactions,
   error_sha256:r.error_sha256,git_footer_sha256:shaK2F(JSON.stringify(r.git_footer_candidate))};
 });
 const report={capture_sha256:payloadK2F.capture_sha256,retained_origin:retainedOriginK2F,records,detailed_evidence_retained:true,
  writes_ok_semantics:'write_file_only',direct_file_mutation_tools:['write_file','edit_file','move_file','delete_file'],counts_are_successful_tool_calls:true,authorized_command_effects_not_counted:true,
  resource_repetition_is_not_call_identity:true,accumulated_tokens_are_not_context_occupancy:true,semantic_acceptance:'NOT_ASSESSED',model_inference:false};
 const encoded=JSON.stringify(report);assert(encoded.length<=MAX_COMPACT_CHARS_K2F,'K2F_COMPACT_REPORT_REQUIRES_SMALLER_COHORT');
 assert.equal(encoded.trim().split(/\s+/u).length,1,'K2F_COMPACT_DATA_MUST_HAVE_NO_WHITESPACE_VALUES');
 console.log('K2F_COMPACT_CHECKPOINT '+encoded);
}
