// B7R: lê pedidos/recibos congelados como dados; nunca executa fonte ou testes históricos.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const [packetPathB7R,packetHashB7R]=process.argv.slice(2);
const shaB7R=(v:string|Buffer)=>createHash('sha256').update(v).digest('hex');
const bytes=fs.readFileSync(packetPathB7R);assert.equal(shaB7R(bytes),packetHashB7R);
const p=JSON.parse(bytes.toString('utf8'));assert.equal(p.schema,'binding-recovery-b7r/v1');
assert.equal(p.origin.sha256,'abd15bcf53429632b07c6d59158fa9bcc614c216378a29411a026256221fe676');
const ids=['e68ccd31-3aab-4a49-bd10-9cb1c46bb7d7','46093ce4-f063-498a-8830-fb36a5c1f42f','6d026b14-c07d-451a-83fc-6905c6b6d377'];
assert.deepEqual(p.jobs.map((j:any)=>j.id),ids);
const [first,second,last]=p.jobs;
const commandB7R=(j:any,id:string)=>{const c=j.commands.find((c:any)=>c.id===id);assert(c);assert.equal(shaB7R(JSON.stringify(c.args)),c.args_sha256);return c.args;};
const sourceB7R=(j:any,id:string)=>{const a=commandB7R(j,id);assert.equal(a.length,2);assert.equal(a[0],'-e');assert.equal(typeof a[1],'string');return a[1] as string;};
const onceB7R=(s:string,t:string)=>{const n=s.indexOf(t);assert(n>=0&&s.indexOf(t,n+1)<0,'B7R_UNRECOGNIZED_OR_REPEATED');return n;};
const segmentB7R=(s:string,start:string,end:string)=>{const a=onceB7R(s,start),b=onceB7R(s,end);assert(b>a);return s.slice(a,b);};
const integrate=sourceB7R(first,'lazy_integrate'),marker=sourceB7R(second,'marker_fix');
// São tokens JSON duplamente delimitados já localizados no argv; JSON.parse não executa JS.
const inserted=JSON.parse(integrate.slice(1453,2877)),old=JSON.parse(marker.slice(625,2049)),updated=JSON.parse(marker.slice(2058,3227));
assert.equal(inserted,old);assert.equal(typeof inserted,'string');assert.equal(typeof updated,'string');
onceB7R(inserted,String.raw`(c) => !used.has(c.start) && ['\n', '\r\n'].includes(source.slice(nextOffset, c.start))`);
assert(!inserted.includes('c.start === nextOffset'));
onceB7R(updated,"(c) => child.type === 'heading' && c.start === child.position.start.offset && !used.has(c.start)");
onceB7R(marker,"text += ' '.repeat(span.length);");
onceB7R(marker,"text += '#' + ' '.repeat(span.length - 1);");
const firstTest=sourceB7R(first,'root_blocks_dom'),failedTest=sourceB7R(second,'root_dom'),passedTest=sourceB7R(last,'root_embedded_dom');
assert.equal(firstTest,failedTest,'primeiro teste reaproveitado, não segunda estratégia idêntica de patch');
assert.equal(segmentB7R(failedTest,'const blocks=','const control='),segmentB7R(passedTest,'const blocks=','const control='));
assert.equal(segmentB7R(failedTest,'const r=cp.spawnSync','console.log('),segmentB7R(passedTest,'const r=cp.spawnSync','console.log('));
assert.deepEqual(commandB7R(first,'root_blocks_types'),commandB7R(second,'root_types'));
assert.deepEqual(commandB7R(second,'root_types'),commandB7R(last,'types'));
const oldControl=segmentB7R(failedTest,'const control=','for(const src of control)'),newControl=segmentB7R(passedTest,'const control=','for(const src of control)');
const oldFence=String.raw`~~~markdown\n> Exemplo\n{: #probe .compact}\n~~~\n`;
const newFence=String.raw`~~~text\n> Exemplo\n{: #probe .compact}\n~~~\n`;
const extraControl=String.raw`control.push('~~~markdown\n#  Título\n\n**Texto**\n~~~\n');`;
onceB7R(oldControl,oldFence);onceB7R(newControl,newFence);onceB7R(newControl,extraControl);
assert.equal(oldControl.replace(oldFence,newFence)+extraControl,newControl);
// Prova de definição do teste, não nova execução Prettier/Kramdown/TypeScript.
for(const t of [failedTest,passedTest]){
 onceB7R(t,"if(!['table','heading','blockquote','unordered_list','ordered_list'].includes(k))delete blocks[k];");
 onceB7R(t,'for(const[k,b]of Object.entries(blocks))for(const blank of [false,true])');
 assert.equal(t.split('for(let i=0;i<3;i++)').length-1,t===failedTest?1:2);
 onceB7R(t,"assert.deepEqual(dom[i+1].targets,dom[i].targets,'Kramdown association '+dom[i].name)");
 onceB7R(t,"assert.equal(dom[i+1].literal,dom[i].literal,'IAL literal '+dom[i].name)");
 onceB7R(t,"assert.equal(await pr.format(src,{...cfg,parser:'markdown',plugins:[plugin]}),await pr.format(src,{...cfg,parser:'markdown'}),'ordinary formatting preserved')");
}
for(const t of ["assert.equal(next,embeddedOut,'embedded markdown idempotence')","assert.ok(body,'embedded fence retained')","rows.push({name:'embedded markdown before',text:embedded},{name:'embedded markdown after',text:body[1]+'\\n'})"])onceB7R(passedTest,t);
const outcomes=[['ok','error'],['ok','ok','error'],['ok','ok']];
const receipts=p.jobs.map((j:any,i:number)=>{
 assert.equal(j.prompt_tokens,0);assert.equal(j.output_tokens,0);
 assert.equal(j.status,i===2?'COMPLETED':'FAILED');
 const observed=j.events.filter((e:any)=>e.phase==='tool_result').map((e:any)=>e.outcome);assert.deepEqual(observed,outcomes[i]);
 const calls=j.events.filter((e:any)=>e.phase==='tool');assert.equal(calls.length,observed.length);assert(calls.every((e:any)=>e.tool==='run_authorized_command'));
 const done=j.events.find((e:any)=>e.phase==='completion_verified');
 if(i===2){assert(done);assert.deepEqual(done.commands,j.sequence);assert.equal(done.mutations,0);assert.equal(done.commits,0);}
 else {assert(!done);assert.equal(j.error_kind,'WORKER_INCOMPLETE');}
 assert(j.git_header[0].startsWith('ESTADO GIT DETERMINÍSTICO (2026-10-18T'));assert.equal(j.git_header[1],'## dev...origin/dev [ahead 13]');
 return {id:j.id,status:j.status,executed_in_order:j.sequence.slice(0,observed.length).map((id:string,k:number)=>({id,outcome:observed[k]})),not_executed:j.sequence.slice(observed.length),git_header:j.git_header};
});
assert(first.return_body.includes('IAL_BINDING_UNRESOLVED'));
assert(second.return_body.includes('ordinary formatting preserved'));
assert(last.return_body.includes('IAL_ROOT_AND_EMBEDDED_OK cases=11 controls=5 cycles=3'));
const maskTest=sourceB7R(second,'marker_protection');
for(const t of ["'UTF16 '+name","'AST '+name","'crlf'","'synthetic protected descendant'"])onceB7R(maskTest,t);
console.log('B7R_RECOVERY_TRACE '+JSON.stringify({packet_sha256:packetHashB7R,
 corrected_gap_in_inserted_source:true,marker_old_source_matches_inserted:true,marker_change_recognized:true,
 root_test_originally_reused:true,root_cases_definition_unchanged:true,dom_comparator_definition_unchanged:true,types_argv_unchanged:true,
 controls_delta:'markdown_with_IAL_moves_from_byte_identity_to_embedded_DOM; literal_text_and_markdown_without_IAL_byte_identity',
 embedded_fence_idempotence_and_shared_dom_assertions:true,mask_protection_command_preceded_dom_failure:true,receipts,
 historical_source_executed:false,historical_tests_repeated:false,native_AST_cause_proved:false,scope:'definitions_and_recorded_execution_only',full_plugin_validated:false}));
