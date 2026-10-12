// Reproduções do runtime real com Ollama simulado, somente no alvo de teste autorizado.
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import assert from 'node:assert/strict';
import { scopeHashS4W } from '../localworker/delegation-policy.mjs';

const workspace = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repo = process.env.TEST_REPO_PATH;
if (!repo || path.basename(path.resolve(repo)).toLowerCase() !== 'jeancarloem.com.blog') throw Error('TEST_REPO_PATH deve apontar ao único alvo autorizado');
const git = async () => (await promisify(execFile)('git',['-C',repo,'status','--porcelain=v1','-uall'],{windowsHide:true})).stdout;
const baseline = await git();
const fixture = path.join(workspace,'constructor','audit-private','hybrid-runtime-'+randomUUID());
await fs.mkdir(fixture,{recursive:true});
for (const name of ['worker-core.mjs','delegation-policy.mjs','job-store.mjs','context-manager.mjs','progress-guard.mjs','AGENTS.md'])
  await fs.copyFile(path.join(workspace,'localworker',name),path.join(fixture,name));
const id = randomUUID();
await fs.writeFile(path.join(fixture,'config.json'),JSON.stringify({model:'fake-hybrid',context_tokens:32768,min_context_tokens:8192,max_steps:40,maintenance_repo:repo,maintenance_id:id,maintenance_hybrid_version:1}));
process.env.LOCAL_WORKER_MAINTENANCE_REPO=repo;
process.env.LOCAL_WORKER_MAINTENANCE_ID=id;
process.env.LOCAL_WORKER_ROOT=fixture;
process.env.LOCAL_WORKER_JOB_ID=randomUUID();
await fs.mkdir(path.join(fixture,'jobs',process.env.LOCAL_WORKER_JOB_ID),{recursive:true});
let calls=0,scenario='intern';
const relative='.localworker-hybrid-'+randomUUID()+'.txt';
const outside='.localworker-hybrid-denied-'+randomUUID()+'.txt';
const server=createServer(async(req,res)=>{
  let input='';for await(const b of req)input+=b;
  if(req.url==='/api/ps'){res.end('{"models":[]}');return;}
  const body=JSON.parse(input);calls++;
  assert.ok(body.messages[0].content.includes('Não participar de QUALQUER avaliação'));
  assert.equal(body.model,'fake-hybrid','Patente não troca o modelo');
  const fn=calls===1?{name:'write_file',arguments:{path:scenario==='outside'?outside:relative,content:'one'}}:
    calls===2?{name:'edit_file',arguments:{path:relative,before:'one',after:'two'}}:null;
  res.end(JSON.stringify({message:{role:'assistant',content:fn?'':'RESULTADO: unidade validada.',...(fn?{tool_calls:[{function:fn}]}:{})}}));
});
await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
process.env.OLLAMA_URL='http://127.0.0.1:'+(server.address() as any).port;
process.env.LOCAL_MODEL='fake-hybrid';
const {runLocalAnalysis,SupervisorCheckpointError}=await import(pathToFileURL(path.join(fixture,'worker-core.mjs')).href);
const request=(regime:string):any=>{
  const r:any={repoPath:repo,task:'Teste vinculado à implementação definitiva SW-HYBRID; somente o arquivo temporário declarado.',mode:'write',expect_changes:true,required_change_paths:[relative],commit_policy:'supervisor',maintenance_supervision:{version:1,criticality:regime==='junior'?3:6,regime,uncertainty_resolved:true,rationale:'Fixture de autorização fornecida exclusivamente pelo supervisor.',evidence:'Reprodução controlada dos efeitos e limites definidos no RCF.',scope_paths:[relative],scope_sha256:'',...(regime==='intern'?{approved_action:{tool:'write_file',args:{path:relative,content:'one'}}}:{})}};
  r.maintenance_supervision.scope_sha256=scopeHashS4W(r);return r;
};
const events:any[]=[];
const run=(r:any)=>runLocalAnalysis(repo,r.task,r.mode,e=>events.push(e),[],true,[relative],false,0,12,r);
const cleanup=async(expected:string)=>{
  assert.equal(await fs.readFile(path.join(repo,relative),'utf8'),expected);
  await fs.unlink(path.join(repo,relative));
};
try {
  await assert.rejects(run(request('intern')),SupervisorCheckpointError);
  assert.equal(calls,2);assert.ok(events.some(e=>e.phase==='supervisor_checkpoint'&&e.effect_attempts===1));
  await cleanup('one'); // Segundo efeito foi impedido antes de editar.
  scenario='junior';calls=0;events.length=0;
  assert.match(await run(request('junior')),/unidade validada/);
  assert.ok(events.some(e=>e.phase==='completion_verified'&&e.mutations===2));
  await cleanup('two'); // Mesmo modelo, maior autonomia autorizada.
  scenario='outside';calls=0;
  await assert.rejects(run(request('junior')),SupervisorCheckpointError);
  await assert.rejects(fs.stat(path.join(repo,outside)),{code:'ENOENT'});
  const changed=request('junior');changed.task+=' expansão não avaliada';calls=0;
  await assert.rejects(run(changed),SupervisorCheckpointError);assert.equal(calls,0,'Vínculo é conferido antes de inferência');
  assert.equal(await git(),baseline);
  console.log('hybrid runtime: mesmo modelo; júnior executa; estagiário checkpoint antes do segundo efeito; escopo alterado/externo sem efeito; Git preservado OK');
} finally {
  await new Promise<void>(r=>server.close(()=>r()));
  // Remover somente o arquivo exclusivo cuja identidade/conteúdo ainda seja reconhecido.
  const leftover=await fs.readFile(path.join(repo,relative),'utf8').catch(e=>{if(e.code==='ENOENT')return null;throw e;});
  if(leftover==='one'||leftover==='two')await fs.unlink(path.join(repo,relative));
  else if(leftover!==null)throw Error('Arquivo inesperado preservado para revisão');
  assert.equal(await git(),baseline);
  const real=await fs.realpath(fixture);
  assert.equal(path.dirname(real),await fs.realpath(path.join(workspace,'constructor','audit-private')));
  await fs.rm(real,{recursive:true,force:true});
}
