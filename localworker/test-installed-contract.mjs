// Teste real de mudanças definitivas; não delega manutenção ao Worker.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFile,spawn} from 'node:child_process';
import {promisify} from 'node:util';
import {createHash} from 'node:crypto';
const repo=process.env.TEST_REPO_PATH,root=process.env.TEST_WORKER_HOME;
if(!repo||path.basename(path.resolve(repo)).toLowerCase()!=='jeancarloem.com.blog'||!root)throw Error('Informe TEST_REPO_PATH autorizado e TEST_WORKER_HOME instalado');
const run=promisify(execFile);
const fingerprint=async()=>{
  const outputs=await Promise.all([['rev-parse','HEAD'],['status','--porcelain=v1','-uall'],['diff','--binary','HEAD']].map(args=>run('git',['-C',repo,...args],{windowsHide:true,maxBuffer:32*1024*1024})));
  return createHash('sha256').update(outputs.map(o=>o.stdout).join('\0')).digest('hex');
};
const baseline=await fingerprint();
const expected=(await fs.readFile(path.join(repo,'README.md'),'utf8')).split(/\r?\n/)[0].trim();
const imported=name=>import(pathToFileURL(path.join(root,name)).href);
const {createJob,jobDir,atomicJson,getState}=await imported('job-store.mjs');
const {ensureMonitor,monitorUrl}=await imported('monitor.mjs');
const monitor=await ensureMonitor();
const created=await createJob({repoPath:repo,mode:'read-only',expect_changes:false,required_read_paths:['README.md'],
  task:'Teste somente leitura. Você é worker subordinado. Leia somente README.md linhas 1–3 e devolva literalmente o primeiro título em uma linha. Não explore outros arquivos de negócio; as normas aplicáveis permanecem obrigatórias.'});
assert.equal(created.busy,false,'Não iniciar teste concorrente a outro job');
const dir=jobDir(created.job_id);
await atomicJson(path.join(dir,'test-baseline.json'),{git_fingerprint:baseline,expected_title:expected});
await atomicJson(path.join(dir,'delivery.json'),{status:'TEST_SUPPRESSED',reason:'Teste local de contrato; sem mensagem a outro chat'});
console.log(JSON.stringify({job_id:created.job_id,monitor_url:monitorUrl(monitor,created.job_id)}));
const stderr=await fs.open(path.join(dir,'runner-stderr.log'),'a');
try {
  const child=spawn(process.execPath,[path.join(root,'worker-runner.mjs'),created.job_id],{cwd:root,windowsHide:true,stdio:['ignore','ignore',stderr.fd],env:{...process.env,LOCAL_WORKER_ROOT:root}});
  await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',(code,signal)=>code===0?resolve():reject(Error(`Runner ${code}/${signal}`)));});
  const state=await getState(created.job_id);
  assert.equal(state.status,'COMPLETED',JSON.stringify({status:state.status,error:state.error,error_kind:state.error_kind}));
  const result=await fs.readFile(path.join(dir,'result.md'),'utf8');
  assert.ok(result.includes(expected),'Título literal do README ausente');
  const evidence=(await fs.readFile(path.join(dir,'evidence.jsonl'),'utf8')).trim().split('\n').map(JSON.parse);
  assert.ok(evidence.some(e=>e.tool==='read_file'&&e.args.path==='README.md'&&e.result.includes(expected)),'Leitura real não comprovada');
  const runtime=JSON.parse(await fs.readFile(path.join(dir,'runtime.json'),'utf8'));
  assert.ok(runtime.files['worker-core.mjs'],'Fingerprint da implementação ausente');
  const preserved=await fingerprint()===baseline;
  assert.ok(preserved,'Git deve permanecer igual ao baseline');
  const verification={test:'installed-contract',job_id:created.job_id,status:'ok',expected,git_preserved:preserved,verified_at:new Date().toISOString()};
  await atomicJson(path.join(dir,'test-verification.json'),verification);
  console.log(JSON.stringify(verification));
} finally {
  await stderr.close();
  assert.equal(await fingerprint(),baseline,'Git do alvo deve preservar HEAD, diff e status');
}
