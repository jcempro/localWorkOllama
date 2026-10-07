import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {promises as fs} from 'node:fs';
import {randomUUID} from 'node:crypto';
import path from 'node:path';
import {jobDir,JOBS} from './job-store.mjs';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const repo=process.env.TEST_REPO_PATH;
if(!repo || path.basename(path.resolve(repo)).toLowerCase()!=='jeancarloem.com.blog')throw Error('Use o repositório de teste autorizado');
let scenario='missing', calls=0;
const server=createServer(async(req,res)=>{
  for await(const chunk of req){}
  if(req.url==='/api/ps'){res.end('{"models":[]}');return;}
  calls++;
  let fn=null;
  if(calls===1) fn=scenario==='read'?{name:'read_file',arguments:{path:'package.json',startLine:1,endLine:5}}:
    scenario==='repeat'?{name:'run_authorized_command',arguments:{id:'once'}}:{name:'git_status',arguments:{}};
  if(scenario==='repeat'&&calls===2)fn={name:'run_authorized_command',arguments:{id:'once'}};
  res.end(JSON.stringify({message:{role:'assistant',content:fn?'':'RESULTADO: resposta candidata.',...(fn?{tool_calls:[{function:fn}]}:{})}}));
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
process.env.OLLAMA_URL=`http://127.0.0.1:${server.address().port}`;
process.env.LOCAL_MODEL='fake-contract-test';
const id=randomUUID(),dir=jobDir(id);
process.env.LOCAL_WORKER_JOB_ID=id;
await fs.mkdir(dir,{recursive:true});
const {runLocalAnalysis,committedUnitSince}=await import('./worker-core.mjs');
const run=(commands,contract,mode='write')=>runLocalAnalysis(repo,'Teste de contrato; nenhuma alteração funcional.',mode,()=>{},commands,false,[],false,0,12,contract);
try {
  await assert.rejects(run([],{required_read_paths:['package.json']},'read-only'),/CONTRACT_UNFULFILLED/);
  scenario='read';calls=0;
  assert.match(await run([],{required_read_paths:['package.json']},'read-only'),/resposta candidata/);
  calls=0;
  const commands=[{id:'one',program:process.execPath,args:['-e','console.log("ONE");\nconsole.log("NEWLINE_OK");']},
    {id:'two',program:process.execPath,args:['-e','console.log("TWO")']}];
  const result=await run(commands,{command_sequence:['one','two'],required_command_ids:['one','two']});
  assert.match(result,/ONE/);assert.match(result,/NEWLINE_OK/);assert.match(result,/TWO/);assert.equal(calls,0);
  assert.match(await run(commands.map(c=>({...c,mode:'read-only'})),{command_sequence:['one']},'read-only'),/NEWLINE_OK/);
  await assert.rejects(run(commands,{command_sequence:['one']},'read-only'),/efeitos compatíveis/);
  await assert.rejects(run([{id:'fail',program:process.execPath,args:['-e','process.exit(2)']}],{command_sequence:['fail']}),/execução suspensa sem repetir/);
  assert.equal(calls,0);
  scenario='repeat';calls=0;
  const events=[];
  await runLocalAnalysis(repo,'Teste de não repetição de comando.','write',e=>events.push(e),[{id:'once',program:process.execPath,args:['-e','console.log("ONCE")']}]);
  assert.equal(events.filter(e=>e.phase==='tool_result'&&e.tool==='run_authorized_command'&&e.outcome==='ok').length,1);
  assert.ok(events.some(e=>e.diagnostic?.includes('já executado com sucesso')));
  const evidence=(await fs.readFile(path.join(dir,'evidence.jsonl'),'utf8')).trim().split('\n').map(JSON.parse);
  assert.ok(evidence.some(e=>e.result.includes('NEWLINE_OK')));
  assert.ok(evidence.some(e=>e.tool==='read_file'&&e.args.path==='package.json'));
  const git=async args=>(await promisify(execFile)('git',['-C',repo,...args],{windowsHide:true})).stdout.trim();
  const head=await git(['rev-parse','HEAD']),parent=await git(['rev-parse','HEAD^']);
  const changed=(await git(['diff-tree','--no-commit-id','--name-only','-r','-z',head])).split('\0').filter(Boolean).map(p=>p.toLowerCase());
  assert.ok(changed.length,'Fixture exige HEAD com alteração verificável');
  const ownership={required:new Set(changed),touched:new Set(),initiallyDirty:new Set()};
  assert.deepEqual(await committedUnitSince(repo,parent,ownership),[head]);
  await assert.rejects(committedUnitSince(repo,parent,{...ownership,initiallyDirty:new Set([changed[0]])}),/sem propriedade comprovada/);
  await assert.rejects(committedUnitSince(repo,parent,{...ownership,required:new Set()}),/sem propriedade comprovada/);
  console.log('contract: missing reads rejected; reads verified; deterministic ordered commands; multiline argv; failure without replay; receipts persisted; success not repeated OK');
} finally {
  server.close();
  assert.equal(path.dirname(await fs.realpath(dir)).toLowerCase(),(await fs.realpath(JOBS)).toLowerCase());
  await fs.rm(dir,{recursive:true,force:true});
}
