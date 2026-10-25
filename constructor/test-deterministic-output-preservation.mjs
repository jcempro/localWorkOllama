// D8O: integração real do runtime, comandos sintéticos read-only; sem Ollama ou negócio externo.
import assert from 'node:assert/strict';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const repository=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const runtime=process.env.D8O_RUNTIME_ROOT?path.resolve(process.env.D8O_RUNTIME_ROOT):path.join(repository,'localworker');
const installed=runtime!==path.join(repository,'localworker');
const {runLocalAnalysis}=await import(new URL('worker-core.mjs',new URL('file:///'+runtime.replaceAll('\\','/')+'/')));
const {jobDir}=await import(new URL('job-store.mjs',new URL('file:///'+runtime.replaceAll('\\','/')+'/')));
const fixture=await fs.mkdtemp(path.join(repository,'constructor/audit-private/d8o-'));
await fs.writeFile(path.join(fixture,'package.json'),'{}');
const jobs=[];let events=[];
const digest=x=>createHash('sha256').update(x).digest('hex');
const command=(id,code)=>({id,program:process.execPath,args:['-e',code],mode:'read-only',timeout_ms:10000,network:false,repeatable:false});
async function setup(){const id=randomUUID(),dir=jobDir(id);jobs.push(dir);process.env.LOCAL_WORKER_JOB_ID=id;await fs.mkdir(dir,{recursive:true});events=[];return dir;}
const {scopeHashS4W,validateSupervisionS4W}=await import(new URL('delegation-policy.mjs',new URL('file:///'+runtime.replaceAll('\\','/')+'/')));
async function run(commands,contract={}){
 // Avaliação explícita do supervisor para esta fixture; o core permanece C8/exclusivo.
 const task='Fixture determinística read-only D8O.';
 const request={repoPath:fixture,task,mode:'read-only',authorized_commands:commands,expect_changes:false,required_change_paths:[],commit_policy:'supervisor',command_sequence:commands.map(c=>c.id),required_command_ids:commands.map(c=>c.id),...contract};
 request.maintenance_supervision={version:1,criticality:5,regime:'junior',uncertainty_resolved:true,scope_paths:['constructor/test-deterministic-output-preservation.mts'],rationale:'Probe sintético restrito: comandos exatos só emitem fixtures, sem fonte/configuração/negócio/rede. Temporários e recibos pertencem ao harness, sem inferência. Alteração do core permanece C8 exclusiva do supervisor.',evidence:'Código do probe previamente examinado pelo supervisor; comandos Node exatos de console/stdout/stderr/exit, orçamento finito. Raiz de fixture e UUIDs próprios validados antes da limpeza; nenhum chat/callback ou manutenção real executados.'};
 request.maintenance_supervision.scope_sha256=scopeHashS4W(request);validateSupervisionS4W(request,true);
 return runLocalAnalysis(fixture,task,'read-only',e=>events.push(e),commands,false,[],false,0,1,request);
}
function noCompletion(){assert.equal(events.some(e=>e.phase==='completion_verified'),false);}
const results=[];
try{
 let dir=await setup();
 const small=await run([command('small','console.log(JSON.stringify({quote:"á😀",n:1}))')]);
 assert.equal(small.split('\n\nEXECUÇÃO COMPROVADA')[0],'RESULTADO DETERMINÍSTICO\nComando small; exit_code=0\nstdout:\n{"quote":"á😀","n":1}\n\nstderr:');
 await assert.rejects(fs.stat(path.join(dir,'command-sequence-result.json')),e=>e.code==='ENOENT');results.push('SMALL_UNCHANGED');if(installed)assert(events.some(e=>e.phase==='supervision_verified'&&e.regime==='junior'));
 dir=await setup();const ids=['first','middle','last'];
 const large=await run(ids.map(id=>command(id,'console.log(JSON.stringify({id:'+JSON.stringify(id)+',payload:"á😀".repeat(2200)}))')));
 const bytes=await fs.readFile(path.join(dir,'command-sequence-result.json')),doc=JSON.parse(bytes);
 assert.equal(doc.schema,'localworker-command-receipts/v1');assert.deepEqual(doc.commands.map(c=>c.id),ids);
 assert.equal(large.includes(digest(bytes)),true);assert(large.split('\n\nEXECUÇÃO COMPROVADA')[0].length<=16000);
 for(const [i,c] of doc.commands.entries()){
  assert.equal(c.exit_code,0);assert.equal(c.receipt_chars,c.receipt.length);assert.equal(c.receipt_sha256,digest(c.receipt));
  const stdout=c.receipt.split('stdout:\n')[1].split('\nstderr:\n')[0];assert.deepEqual(JSON.parse(stdout),{id:ids[i],payload:'á😀'.repeat(2200)});
  assert(large.includes('pointer=/commands/'+i+'/receipt'));assert(!c.receipt.includes('conteúdo truncado'));
 }
 assert.equal(events.filter(e=>e.phase==='tool_result').length,3);assert.equal(events.filter(e=>e.phase==='deterministic_output_preserved').length,1);
 results.push('AGGREGATE_UNICODE_HASHES_ORDER_NO_REPLAY');
 events=[];
 const repeated=await run(ids.map(id=>({...command(id,'console.log(JSON.stringify({id:'+JSON.stringify(id)+',payload:"á😀".repeat(2200)}))'),repeatable:true})));
 assert.equal(repeated,large);assert((await fs.readFile(path.join(dir,'command-sequence-result.json'))).equals(bytes));results.push('IDENTICAL_ARTIFACT_IDEMPOTENT');
 dir=await setup();await run([command('single','console.log(JSON.stringify({payload:"Z".repeat(30000)}))')]);
 const single=JSON.parse(await fs.readFile(path.join(dir,'command-sequence-result.json')));assert.equal(JSON.parse(single.commands[0].receipt.split('stdout:\n')[1].split('\nstderr:\n')[0]).payload,'Z'.repeat(30000));results.push('SINGLE_OVER_24K_PRESERVED');
 dir=await setup();await fs.writeFile(path.join(dir,'command-sequence-result.json'),'SENTINEL');
 await assert.rejects(run([command('conflict','console.log("X".repeat(20000))')]),/conflito/);assert.equal(await fs.readFile(path.join(dir,'command-sequence-result.json'),'utf8'),'SENTINEL');noCompletion();results.push('CONFLICT_FAIL_CLOSED');
 dir=await setup();await fs.mkdir(path.join(dir,'command-sequence-result.json'));
 await assert.rejects(run([command('persistence','console.log("X".repeat(20000))')]),/conflito/);noCompletion();results.push('PERSISTENCE_INVALID_TARGET_FAIL_CLOSED');
 dir=await setup();const sentinel=path.join(fixture,'hardlink-sentinel');await fs.writeFile(sentinel,'PROTECTED');await fs.link(sentinel,path.join(dir,'command-sequence-result.json'));
 await assert.rejects(run([command('linked','console.log("X".repeat(20000))')]),/conflito/);assert.equal(await fs.readFile(sentinel,'utf8'),'PROTECTED');noCompletion();results.push('HARDLINK_FAIL_CLOSED');
 dir=await setup();await assert.rejects(run([command('before','console.log("before")'),command('failure','process.stdout.write("O".repeat(7000));process.stderr.write("E".repeat(8000));process.exitCode=2'),command('never','console.log("MUST_NOT_RUN")')]),/execução suspensa sem repetir/);
 const failed=JSON.parse(await fs.readFile(path.join(dir,'command-sequence-result.json')));assert.deepEqual(failed.commands.map(c=>[c.id,c.exit_code]),[['before',0],['failure',2]]);assert(failed.commands[1].receipt.includes('O'.repeat(7000)));assert(failed.commands[1].receipt.includes('E'.repeat(8000)));assert.equal(events.filter(e=>e.phase==='tool_result').length,2);noCompletion();results.push('FAILURE_STDOUT_STDERR_FIRST_ERROR_NO_REPLAY');
 dir=await setup();await assert.rejects(run([command('r8v','console.log("X".repeat(20000))')],{response_contract:{version:1,max_words:1600}}),/RESPONSE_CONTRACT/);
 assert.equal(events.filter(e=>e.phase==='tool_result').length,1);noCompletion();await fs.stat(path.join(dir,'command-sequence-result.json'));results.push('R8V_UNCHANGED_NO_REPLAY');
 delete process.env.LOCAL_WORKER_JOB_ID;events=[];await assert.rejects(run([command('nojob','console.log("X".repeat(20000))')]),/OUTPUT_CAPACITY/);noCompletion();results.push('NO_PERSISTENCE_FAIL_CLOSED');
 const proof={schema:1,runtime,installed,results,ollama_inference:false,external_business_executed:false,passed:true};
 await fs.writeFile(path.join(repository,'constructor/audit-private/d8o-'+(installed?'installed':'source')+'-validation.json'),JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify(proof));
}finally{
 delete process.env.LOCAL_WORKER_JOB_ID;
 for(const target of [...jobs,fixture]){
  const resolved=path.resolve(target),allowed=target===fixture?path.join(repository,'constructor','audit-private')+path.sep:path.join(runtime,'jobs')+path.sep;
  assert(resolved.toLowerCase().startsWith(allowed.toLowerCase()));
  await fs.rm(resolved,{recursive:true,force:true});
 }
}
