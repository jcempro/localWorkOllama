// S6D: teste interno, MCP real/SQLite/filesystem isolados, sem inferência ou UI real.
import assert from 'node:assert/strict';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
const sourceS6D=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../localworker');
const fixtureS6D=await fs.mkdtemp(path.join(sourceS6D,'.s6d-fixture-'));
const canonicalS6D=await fs.realpath(fixtureS6D);
try{
  for(const name of await fs.readdir(sourceS6D))if((name.endsWith('.mjs')&&!name.startsWith('test-'))||name==='config.json')
    await fs.copyFile(path.join(sourceS6D,name),path.join(fixtureS6D,name));
  const monitorPathS6D=path.join(fixtureS6D,'monitor.mjs');
  const monitorS6D=await fs.readFile(monitorPathS6D,'utf8');
  assert.equal(monitorS6D.split('export async function ensureMonitor()').length,2);
  await fs.writeFile(monitorPathS6D,monitorS6D.replace('export async function ensureMonitor()','async function originalEnsureMonitorS6D()')+`
export async function ensureMonitor(){
  await fs.appendFile(new URL('./monitor-attempts.txt',import.meta.url),'attempt\\n');
  if(process.env.S6D_MONITOR_MODE==='available')return {port:49767,token:'fixture-only'};
  if(process.env.S6D_MONITOR_MODE==='timeout')throw new Error('Interface local de acompanhamento não iniciou em 6 segundos.');
  throw Object.assign(new Error('token=PRIVATE_FIXTURE C:/private/example'),{code:'EACCES'});
}
`);
  const loadS6D=name=>import(pathToFileURL(path.join(fixtureS6D,name)).href);
  const storeS6D=await loadS6D('job-store.mjs');
  const {callLocalWorker}=await loadS6D('mcp-call.mjs');
  const homeS6D=path.join(fixtureS6D,'codex');await fs.mkdir(homeS6D);
  const envS6D={...process.env,CODEX_HOME:homeS6D,LOCAL_CODEX_HOME:homeS6D};delete envS6D.LOCAL_WORKER_JOB_ID;
  const callS6D=async(name,args,mode='unavailable')=>JSON.parse(await callLocalWorker({name,args,
    serverPath:path.join(fixtureS6D,'server.mjs'),env:{...envS6D,S6D_MONITOR_MODE:mode}}));
  const attemptsS6D=async()=>(await fs.readFile(path.join(fixtureS6D,'monitor-attempts.txt'),'utf8').catch(()=>''))
    .split('attempt').length-1;
  async function addS6D(status){
    const id=randomUUID(),now=new Date().toISOString(),dir=storeS6D.jobDir(id);await fs.mkdir(dir,{recursive:true});
    await storeS6D.setState(id,{job_id:id,status,created_at:now,heartbeat_at:now,pid:process.pid,phase:'fixture'});
    await storeS6D.atomicJson(path.join(dir,'request.json'),{task:'Fixture sem negócio',repoPath:sourceS6D,thread_id:randomUUID()});
    await storeS6D.atomicJson(path.join(dir,'delivery.json'),{status:'PAUSED_USER'});
    if(status==='COMPLETED')await fs.writeFile(path.join(dir,'result.md'),'Resultado privado da fixture.');return id;
  }
  const terminalS6D=await addS6D('COMPLETED'),activeS6D=await addS6D('RUNNING');
  for(const id of [terminalS6D,activeS6D]){
    const before=await fs.readFile(path.join(storeS6D.jobDir(id),'state.json'),'utf8');
    for(const mode of ['unavailable','timeout','available']){
      const count=await attemptsS6D(),r=await callS6D('local_status',{job_id:id},mode);
      assert.equal(r.job_id,id);assert.equal(r.status,id===terminalS6D?'COMPLETED':'RUNNING');assert.equal(r.delivery,'PAUSED_USER');
      assert.equal(await attemptsS6D(),count+1,'Uma tentativa canônica por consulta');
      assert.equal(r.monitor_status,mode==='available'?'AVAILABLE':'UNAVAILABLE');
      if(mode==='available'){
        assert.match(r.monitor_url,new RegExp('/job/'+id+'\\?token=fixture-only$'));
        assert.equal(r.monitor_index_url,'http://127.0.0.1:49767/?token=fixture-only');assert.equal(r.monitor_error,undefined);
      }else{
        assert.equal(r.monitor_url,null);assert.equal(r.monitor_index_url,null);
        assert.equal(r.monitor_error.code,mode==='timeout'?'START_TIMEOUT':'EACCES');
        assert.ok(!JSON.stringify(r).includes('PRIVATE_FIXTURE'));assert.ok(!JSON.stringify(r).includes('C:/private'));
      }
    }
    assert.equal(await fs.readFile(path.join(storeS6D.jobDir(id),'state.json'),'utf8'),before,'Não alterar estado do job');
  }
  const countS6D=await attemptsS6D();
  await assert.rejects(()=>callS6D('local_status',{job_id:randomUUID()}),/WORKER_INFRA_ERROR/);
  assert.equal(await attemptsS6D(),countS6D,'Erro de leitura não vira sucesso parcial');
  await assert.rejects(()=>callS6D('local_monitor',{}),/WORKER_INFRA_ERROR/);
  assert.equal(await attemptsS6D(),countS6D+1);
  const resultS6D=await callS6D('local_result',{job_id:terminalS6D});
  assert.equal(resultS6D.result,'Resultado privado da fixture.');assert.equal(resultS6D.status,'COMPLETED');
  assert.ok(resultS6D.review.receipt_id);assert.equal(await attemptsS6D(),countS6D+1,'Resultado/Q8S independem da UI');
  assert.equal((await callS6D('local_result',{job_id:activeS6D})).status,'RUNNING');
  assert.equal(await attemptsS6D(),countS6D+1);
  console.log('S6D_OK: MCP real; ativo/terminal; UI disponível/EACCES/timeout; sem falso status/URL/segredo; uma tentativa; erro de leitura preservado; resultado/Q8S independentes; nenhum envio/inferência.');
}finally{
  const actualS6D=await fs.realpath(fixtureS6D).catch(()=>null);
  if(actualS6D===canonicalS6D&&path.dirname(fixtureS6D)===sourceS6D&&path.basename(fixtureS6D).startsWith('.s6d-fixture-'))
    await fs.rm(fixtureS6D,{recursive:true,force:true});
}
