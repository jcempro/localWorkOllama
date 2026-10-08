// Teste real de mudanças definitivas; não delega manutenção ao Worker.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFile,spawn} from 'node:child_process';
import {promisify} from 'node:util';
import {createHash,randomUUID} from 'node:crypto';
const repo=process.env.TEST_REPO_PATH,root=process.env.TEST_WORKER_HOME;
if(!repo||path.basename(path.resolve(repo)).toLowerCase()!=='jeancarloem.com.blog'||!root)throw Error('Informe TEST_REPO_PATH autorizado e TEST_WORKER_HOME instalado');
const writeTest=process.argv.includes('--write');
const marker=`localworker-contract-${randomUUID()}`;
const relative=`.${marker}.txt`;
const target=path.resolve(repo,relative);
const run=promisify(execFile);
const fingerprint=async()=>{
  const outputs=await Promise.all([['rev-parse','HEAD'],['status','--porcelain=v1','-uall'],['diff','--binary','HEAD']].map(args=>run('git',['-C',repo,...args],{windowsHide:true,maxBuffer:32*1024*1024})));
  const hash=createHash('sha256').update(outputs.map(o=>o.stdout).join('\0'));
  const untracked=(await run('git',['-C',repo,'ls-files','--others','--exclude-standard','-z'],{windowsHide:true,maxBuffer:32*1024*1024})).stdout.split('\0').filter(Boolean).sort();
  for(const name of untracked){
    const file=path.resolve(repo,name),stat=await fs.lstat(file);
    hash.update('\0'+name+'\0');
    if(stat.isSymbolicLink()){hash.update(await fs.readlink(file));continue;}
    assert.ok(stat.isFile(),'Não seguir diretório inesperado no baseline');
    const real=await fs.realpath(file),inside=path.relative(await fs.realpath(repo),real);
    assert.ok(!path.isAbsolute(inside)&&inside!=='..'&&!inside.startsWith('..'+path.sep),'Baseline fora da raiz');
    for await(const chunk of createReadStream(file))hash.update(chunk);
  }
  return hash.digest('hex');
};
const baseline=await fingerprint();
const expected=writeTest?marker:(await fs.readFile(path.join(repo,'README.md'),'utf8')).split(/\r?\n/)[0].trim();
if(writeTest)assert.equal(await fs.lstat(target).then(()=>true,e=>{if(e.code==='ENOENT')return false;throw e;}),false,'Fixture não pode sobrescrever arquivo existente');
const imported=name=>import(pathToFileURL(path.join(root,name)).href);
const {createJob,jobDir,atomicJson,getState}=await imported('job-store.mjs');
const {ensureMonitor,monitorUrl}=await imported('monitor.mjs');
const monitor=await ensureMonitor();
const created=await createJob(writeTest?{repoPath:repo,mode:'write',expect_changes:true,required_change_paths:[relative],commit_policy:'supervisor',
  task:`Teste de escrita autorizado pelo usuário exclusivamente neste repositório. Você é worker subordinado. Crie somente ${relative} com uma linha literal ${marker}, usando write_file; responda somente caminho e conteúdo. Não altere outros arquivos nem faça commit deste fixture descartável. O supervisor verifica e remove somente esse arquivo e versiona o teste no produto. Normas aplicáveis permanecem obrigatórias; nenhuma FT de negócio está delegada.`}
  :{repoPath:repo,mode:'read-only',expect_changes:false,required_read_paths:['README.md'],
  task:'Teste somente leitura. Você é worker subordinado. Leia somente README.md linhas 1–3 e devolva literalmente o primeiro título em uma linha. Não explore outros arquivos de negócio; as normas aplicáveis permanecem obrigatórias.'});
assert.equal(created.busy,false,'Não iniciar teste concorrente a outro job');
const dir=jobDir(created.job_id);
await atomicJson(path.join(dir,'test-baseline.json'),{git_fingerprint:baseline,expected,mode:writeTest?'write':'read-only',fixture:writeTest?relative:null});
await atomicJson(path.join(dir,'delivery.json'),{status:'TEST_SUPPRESSED',reason:'Teste local de contrato; sem mensagem a outro chat'});
console.log(JSON.stringify({job_id:created.job_id,monitor_url:monitorUrl(monitor,created.job_id)}));
const stderr=await fs.open(path.join(dir,'runner-stderr.log'),'a');
let failure=null;
try {
  const child=spawn(process.execPath,[path.join(root,'worker-runner.mjs'),created.job_id],{cwd:root,windowsHide:true,stdio:['ignore','ignore',stderr.fd],env:{...process.env,LOCAL_WORKER_ROOT:root}});
  await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',(code,signal)=>code===0?resolve():reject(Error(`Runner ${code}/${signal}`)));});
  const state=await getState(created.job_id);
  assert.equal(state.status,'COMPLETED',JSON.stringify({status:state.status,error:state.error,error_kind:state.error_kind}));
  const result=await fs.readFile(path.join(dir,'result.md'),'utf8');
  assert.ok(result.includes(expected),'Conteúdo literal esperado ausente');
  const evidence=(await fs.readFile(path.join(dir,'evidence.jsonl'),'utf8')).trim().split('\n').map(JSON.parse);
  if(writeTest){
    assert.equal((await fs.readFile(target,'utf8')).trim(),expected,'Escrita real não corresponde ao contrato');
    assert.ok(evidence.some(e=>e.tool==='write_file'&&e.args.path===relative),'Escrita real não comprovada no recibo');
  }else assert.ok(evidence.some(e=>e.tool==='read_file'&&e.args.path==='README.md'&&e.result.includes(expected)),'Leitura real não comprovada');
  const runtime=JSON.parse(await fs.readFile(path.join(dir,'runtime.json'),'utf8'));
  assert.ok(runtime.files['worker-core.mjs'],'Fingerprint da implementação ausente');
} catch(error){
  failure=error;
} finally {
  await stderr.close();
  try {
    if(writeTest){
      const stat=await fs.lstat(target).catch(e=>{if(e.code==='ENOENT')return null;throw e;});
      if(stat){
        assert.ok(stat.isFile()&&!stat.isSymbolicLink()&&stat.nlink===1,'Preservar fixture com identidade inesperada');
        assert.equal(path.dirname(await fs.realpath(target)),await fs.realpath(repo),'Limpeza somente na raiz exata');
        assert.equal((await fs.readFile(target,'utf8')).trim(),marker,'Preservar conteúdo inesperado para diagnóstico');
        await fs.unlink(target);
      }
    }
    assert.equal(await fingerprint(),baseline,'Git e arquivos não rastreados devem preservar o baseline');
  }catch(error){failure=failure?new AggregateError([failure,error],'Teste e restauração falharam'):error;}
  const verification={test:'installed-contract',job_id:created.job_id,mode:writeTest?'write':'read-only',status:failure?'failed':'ok',expected,git_preserved:await fingerprint()===baseline,verified_at:new Date().toISOString(),error:failure?String(failure):null};
  await atomicJson(path.join(dir,'test-verification.json'),verification);
  console.log(JSON.stringify(verification));
}
if(failure)throw failure;
