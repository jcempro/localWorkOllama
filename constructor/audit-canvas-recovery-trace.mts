// R3C: definições e medições congeladas; não executar browser, renderer, QR ou pacotes históricos.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const [packetPathR3C,packetHashR3C]=process.argv.slice(2);
const shaR3C=(v:string|Buffer)=>createHash('sha256').update(v).digest('hex');
const bytes=fs.readFileSync(packetPathR3C);assert.equal(shaR3C(bytes),packetHashR3C);
const p=JSON.parse(bytes.toString('utf8'));assert.equal(p.schema,'canvas-recovery-r3c/v1');
assert.equal(p.origin.sha256,'abd15bcf53429632b07c6d59158fa9bcc614c216378a29411a026256221fe676');
assert.deepEqual(p.jobs.map((j:any)=>j.id),['1609eab8-23f9-4b29-a46f-f0531fbaa49f','cad1ed1d-7d04-4e6a-a609-7fedb73e5bd5','3803412e-000c-42c4-9d93-f24f54c96786']);
const [failed,diagnostic,isolated]=p.jobs;
const argsR3C=(j:any,id:string)=>{const c=j.commands.find((c:any)=>c.id===id);assert(c);assert.equal(shaR3C(JSON.stringify(c.args)),c.args_sha256);return c.args;};
const moduleSourceR3C=(j:any,id:string)=>{const a=argsR3C(j,id);assert.equal(a[0],'--input-type=module');assert.equal(a[1],'-e');assert.equal(a.length,3);return a[2] as string;};
const onceR3C=(s:string,t:string)=>{const n=s.indexOf(t);assert(n>=0&&s.indexOf(t,n+1)<0,'R3C_FRAGMENT '+JSON.stringify({sha256:shaR3C(t),length:t.length,first:n}));return n;};
const original=moduleSourceR3C(failed,'render-test'),probe=moduleSourceR3C(diagnostic,'diagnose');
const create=argsR3C(isolated,'create-test');assert.equal(create[0],'-e');assert.equal(create.length,2);
const generated=p.generated_test;assert.equal(shaR3C(generated.source),generated.source_sha256);
assert.equal(JSON.parse(create[1].slice(generated.start,generated.end)),generated.source);
assert(create[1].slice(0,generated.start).endsWith("fs.writeFileSync('scripts/test_donations_qr_composed.ts',"));
const permanent=generated.source as string;
onceR3C(original,"await page.setContent('<canvas id=\"qr\"></canvas>')");
onceR3C(original,"const c=document.getElementById('qr')");
onceR3C(probe,'for(const software of [false,true])');onceR3C(probe,"globalThis.c=document.createElement('canvas')");
onceR3C(probe,"globalThis.c.getContext('2d',{willReadFrequently:flag})");onceR3C(probe,'for(const m of methods)');
onceR3C(permanent,"const c=document.createElement('canvas'),ctx=c.getContext('2d',{willReadFrequently:true})");
onceR3C(permanent,'assert.equal(output.readFrequently,true)');
for(const s of [original,probe,permanent])onceR3C(s,'left=48+a.x*8,top=48+a.y*8,side=a.size*8');
for(const s of [original,permanent]){
 onceR3C(s,'x>=left&&x<left+side&&y>=top&&y<top+side');onceR3C(s,'assert.equal(output.outside,0,');onceR3C(s,'assert.ok(output.inside>0,');onceR3C(s,'assert.equal(count,5)');
}
onceR3C(original,"assert.deepEqual(Buffer.from(result.binaryData),Buffer.from(spec.payload,'utf8'),m.id)");
onceR3C(permanent,"assert.deepEqual(Buffer.from(decoded.binaryData),Buffer.from(spec.payload,'utf8'),method.id)");
onceR3C(original,'base[i]!==after[i]||base[i+1]!==after[i+1]||base[i+2]!==after[i+2]||base[i+3]!==after[i+3]');
onceR3C(permanent,'changed=[0,1,2,3].some(k=>base[i+k]!==after[i+k])');
console.log('R3C_CHECKPOINT source_definitions=verified historical_execution=false');
// Probes próprios de canais e fronteiras; não são pixels reais ou reprodução do renderer.
let channelCases=0;for(let channel=-1;channel<4;channel++){
 const base=[10,20,30,40],after=[...base];if(channel>=0)after[channel]++;
 const explicit=base[0]!==after[0]||base[1]!==after[1]||base[2]!==after[2]||base[3]!==after[3];
 const some=[0,1,2,3].some(k=>base[k]!==after[k]);assert.equal(explicit,some);assert.equal(some,channel>=0);channelCases++;
}
const box={left:48,top:56,side:16},points=[[47,56,false],[48,56,true],[63,71,true],[64,56,false],[48,72,false],[48,55,false]] as const;
for(const [x,y,want]of points)assert.equal(x>=box.left&&x<box.left+box.side&&y>=box.top&&y<box.top+box.side,want);
const rowsR3C=(j:any)=>j.body.split('\n').filter((s:string)=>s.startsWith('{"id":')).map((s:string)=>JSON.parse(s));
const diagRows=rowsR3C(diagnostic),finalRows=rowsR3C(isolated);assert.equal(diagRows.length,4);assert.equal(finalRows.length,5);
assert.deepEqual(diagRows.map((r:any)=>[r.id,r.software]),[['pix',false],['usdt-bnb',false],['pix',true],['usdt-bnb',true]]);
for(const r of diagRows){assert.equal(r.outside,0);assert(r.inside>0);assert.equal(r.attributes.willReadFrequently,r.software);assert.equal(r.minY,r.height);assert.equal(r.maxY,-1);}
assert.deepEqual(finalRows.map((r:any)=>r.id),['pix','usdt-bnb','btc-bitcoin','xec-ecash','bttc-tron']);
for(const r of finalRows){assert.equal(r.outside,0);assert(r.inside>0&&r.width>0&&r.height>0);}
assert(failed.body.includes('1185 !== 0'));assert(failed.body.includes('usdt-bnb'));
assert(diagnostic.body.includes('FINITE_CANVAS_RASTER_DIAGNOSTIC_RECORDED'));
assert(isolated.body.includes('COMPOSED_QR_BYTE_EXACT_OUTSIDE_PRESERVED_OK'));
const wanted=[['ok','ok','error'],['ok'],['ok','ok']];
const receipts=p.jobs.map((j:any,i:number)=>{
 assert.equal(j.prompt_tokens,0);assert.equal(j.output_tokens,0);assert.equal(j.status,i===0?'FAILED':'COMPLETED');
 const outcomes=j.events.filter((e:any)=>e.phase==='tool_result').map((e:any)=>e.outcome);assert.deepEqual(outcomes,wanted[i]);assert.equal(j.sequence.length,outcomes.length);
 const done=j.events.find((e:any)=>e.phase==='completion_verified');if(i===0){assert(!done);assert.equal(j.error_kind,'WORKER_INCOMPLETE');}
 else {assert(done);assert.deepEqual(done.commands,j.sequence);assert.equal(done.commits,0);assert.equal(done.mutations,i===2?1:0);}
 assert.equal(j.git_header[1],'## dev...origin/dev [ahead 30]');
 return {id:j.id,status:j.status,commands:j.sequence.map((id:string,k:number)=>({id,outcome:outcomes[k]})),git_header:j.git_header};
});
console.log('R3C_CANVAS_TRACE '+JSON.stringify({packet_sha256:packetHashR3C,
 source_changes:{original_shared_dom_canvas:true,diagnostic_canvas_per_flag:true,permanent_canvas_per_method:true,explicit_read_frequently:true},
 criteria:{outside_zero_inside_positive_count_five_and_payload_bytes_preserved_in_definition:true,synthetic_channel_cases:channelCases,synthetic_boundary_cases:points.length},
 recorded_diagnostic:diagRows.map(({id,software,outside,inside}:any)=>({id,software,outside,inside})),recorded_permanent:finalRows,receipts,
 failure_reproduced_in_diagnostic:false,GPU_cause_proved:false,images_reviewed_now:false,renderer_or_browser_executed_now:false,
 scope:'frozen_definitions_receipts_and_synthetic_predicates_only',full_feature_validated:false}));
