import assert from 'node:assert/strict';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import vm from 'node:vm';
const source=path.dirname(fileURLToPath(import.meta.url));
const fixture=await fs.mkdtemp(path.join(source,'.q8s-fixture-')),canonical=await fs.realpath(fixture);
try{
  for(const f of await fs.readdir(source))if((f.endsWith('.mjs')&&!f.startsWith('test-'))||f==='config.json')
    await fs.copyFile(path.join(source,f),path.join(fixture,f));
  const load=f=>import(pathToFileURL(path.join(fixture,f)));
  const s=await load('job-store.mjs'),q=await load('supervisor-review.mjs'),control=await load('job-control.mjs');
  const reviewer=randomUUID(),home=path.join(fixture,'codex');await fs.mkdir(home);
  const db=new DatabaseSync(path.join(home,'state_5.sqlite'));
  db.exec('CREATE TABLE threads(id TEXT PRIMARY KEY,archived INTEGER,cwd TEXT)');
  db.prepare('INSERT INTO threads VALUES(?,0,?)').run(reviewer,source);db.close();
  const env={...process.env,CODEX_HOME:home,LOCAL_CODEX_HOME:home};delete env.LOCAL_WORKER_JOB_ID;
  const {callLocalWorker}=await load('mcp-call.mjs');
  const beforeRequests=await fs.readdir(s.JOBS).catch(()=>[]);
  await assert.rejects(()=>callLocalWorker({name:'local_analyze',args:{repoPath:source,thread_id:reviewer,task:'Fixture sem efeito',mode:'read-only',provided_evidence:{source:'fixture',content:'{"ok":true}'},response_contract:{version:1,json_schema:{type:'object',properties:{},required:[],additionalProperties:true}}},serverPath:path.join(fixture,'server.mjs'),env}),/WORKER_REQUEST_REJECTED: RESPONSE_CONTRACT/);
  assert.deepEqual(await fs.readdir(s.JOBS).catch(()=>[]),beforeRequests,'Contrato inválido não cria job/monitor');
  const {queueMessage}=await load('delivery.mjs');
  const callback=queueMessage(randomUUID(),{status:'COMPLETED'});
  assert.match(callback,/Consulte local_result uma única vez/);assert.match(callback,/local_review/);
  assert.match(callback,/sem nova inferência/);assert.match(callback,/sem nota inventada nem repetir local_result/);
  assert.match(await fs.readFile(path.join(source,'AGENTS.md'),'utf8'),/somente o supervisor atribui\/confirma nota/i);
  async function add(status='COMPLETED',det=false){
    const id=randomUUID(),dir=s.jobDir(id),now=new Date().toISOString();await fs.mkdir(dir,{recursive:true});
    await s.setState(id,{job_id:id,status,created_at:now,completed_at:now});
    await s.atomicJson(path.join(dir,'request.json'),{task:'Fixture Q8S, sem negócio',thread_id:reviewer,repoPath:source,command_sequence:det?['verify']:[]});
    await s.atomicJson(path.join(dir,'delivery.json'),{status:'QUEUED_TO_CHAT'});
    await fs.writeFile(path.join(dir,status==='COMPLETED'?'result.md':'error.txt'),'Fixture de retorno, não avaliação real.');return id;
  }
  const make=(id,r,score=8,reason='Evidência exclusiva da fixture de teste.')=>({job_id:id,receipt_id:r.review.receipt_id,
    receipt_token:r.review.receipt_token,expected_revision:0,review_complete:true,reviewer_thread_id:reviewer,score,reason});
  const id=await add();
  assert.equal((await q.reviewSnapshotQ8S(id)).status,'NOT_ASSESSED');
  await assert.rejects(()=>q.recordReviewQ8S({...make(id,{review:{receipt_id:'a'.repeat(64),receipt_token:'b'.repeat(64)}})}),/obsoleta|recibo/);
  assert.equal(await fs.stat(path.join(s.jobDir(id),'supervisor-review.json')).then(()=>true,()=>false),false);
  const r=await q.issueReviewReceiptQ8S(id),input=make(id,r);
  assert.deepEqual((await q.issueReviewReceiptQ8S(id)).review,r.review);
  for(const patch of [{review_complete:false},{score:11},{score:2,reason:''},{score:9,reason:''},{score:1.5},{receipt_token:'a'.repeat(64)}])
    await assert.rejects(()=>q.recordReviewQ8S({...input,...patch}));
  const concurrent=await Promise.all([q.recordReviewQ8S(input),q.recordReviewQ8S(input)]);
  assert.deepEqual(concurrent.map(x=>x.idempotent).sort(),[false,true]);
  let snap=await q.reviewSnapshotQ8S(id);assert.equal(snap.assessment.score,8);
  assert.ok(!JSON.stringify(snap).includes(input.receipt_token));
  await assert.rejects(()=>q.recordReviewQ8S({...input,score:7}),/concorrente/);
  await q.recordReviewQ8S({...input,expected_revision:1,score:6,reason:''});
  assert.equal((await q.reviewSnapshotQ8S(id)).history.length,2);
  await fs.appendFile(path.join(s.jobDir(id),'result.md'),' Retorno alterado.');
  assert.equal((await q.reviewSnapshotQ8S(id)).status,'STALE');
  await assert.rejects(()=>q.recordReviewQ8S({...input,expected_revision:2}),/obsoleta/);
  const changed=await q.issueReviewReceiptQ8S(id);assert.notEqual(changed.review.receipt_id,r.review.receipt_id);
  assert.equal(changed.review.assessment,null);assert.equal(changed.review.revision,0);
  for(let i=2;i<16;i++){
    await fs.appendFile(path.join(s.jobDir(id),'result.md'),String(i));await q.issueReviewReceiptQ8S(id);
  }
  await fs.appendFile(path.join(s.jobDir(id),'result.md'),'limit');
  await assert.rejects(()=>q.issueReviewReceiptQ8S(id),/limite de16/);
  const failed=await add('FAILED',true),rf=await q.issueReviewReceiptQ8S(failed);
  await q.recordReviewQ8S(make(failed,rf,9,'Falha legitimamente diagnosticada nesta fixture.'));
  assert.equal((await q.reviewSnapshotQ8S(failed)).execution_kind,'deterministic');
  for(let revision=1;revision<32;revision++)await q.recordReviewQ8S({...make(failed,rf,revision%2?6:7,''),expected_revision:revision});
  await assert.rejects(()=>q.recordReviewQ8S({...make(failed,rf,8,'Limite desta fixture.'),expected_revision:32}),/limite de32/);
  // Estados recusados são reais no filesystem, sem criar recibo antecipado.
  for(const status of ['RUNNING','QUEUED','CANCELLED']){
    const other=await add(status);await assert.rejects(()=>q.issueReviewReceiptQ8S(other),/somente retorno/);
    assert.equal(await fs.stat(path.join(s.jobDir(other),'supervisor-review.json')).then(()=>true,()=>false),false);
  }
  process.env.LOCAL_WORKER_JOB_ID=id;
  await assert.rejects(()=>q.issueReviewReceiptQ8S(id),/supervisor/);
  await assert.rejects(()=>q.recordReviewQ8S(input),/supervisor/);delete process.env.LOCAL_WORKER_JOB_ID;
  const damaged=await add();await fs.writeFile(path.join(s.jobDir(damaged),'supervisor-review.json'),'');
  await assert.rejects(()=>q.issueReviewReceiptQ8S(damaged));
  assert.equal((await q.reviewSnapshotQ8S(damaged)).status,'UNAVAILABLE');
  const deleting=await add(),rd=await q.issueReviewReceiptQ8S(deleting);
  await Promise.allSettled([control.deleteJob(deleting),q.recordReviewQ8S(make(deleting,rd))]);
  assert.equal(await fs.stat(s.jobDir(deleting)).then(()=>true,()=>false),false);
  await assert.rejects(()=>q.recordReviewQ8S(make(deleting,rd)),/ENOENT/);
  const expired=await add(),re=await q.issueReviewReceiptQ8S(expired);
  await s.setState(expired,{...(await s.getState(expired)),completed_at:'2000-01-01T00:00:00.000Z'});
  const retired=await Promise.allSettled([s.pruneJobHistory({force:true}),q.recordReviewQ8S(make(expired,re))]);
  assert.equal(retired[0].status,'fulfilled');
  assert.ok(!retired[0].value.errors.some(e=>e.job_id===expired),JSON.stringify(retired[0].value.errors));
  assert.equal(await fs.stat(s.jobDir(expired)).then(()=>true,()=>false),false);
  const api=await add('FAILED');
  const received=JSON.parse(await callLocalWorker({name:'local_result',args:{job_id:api},serverPath:path.join(fixture,'server.mjs'),env}));
  assert.equal(received.status,'FAILED');assert.equal(received.result,'Fixture de retorno, não avaliação real.');
  assert.equal(received.review.revision,0);
  const args={...make(api,received,7,''),reviewer_repo_path:source};
  const response=JSON.parse(await callLocalWorker({name:'local_review',args,serverPath:path.join(fixture,'server.mjs'),env}));
  assert.equal(response.assessment.score,7);
  const again=JSON.parse(await callLocalWorker({name:'local_review',args,serverPath:path.join(fixture,'server.mjs'),env}));
  assert.equal(again.idempotent,true);
  const legacy=await add('FAILED'),hash=v=>createHash('sha256').update(v).digest('hex');
  const importArgs={job_id:legacy,expected_revision:0,review_complete:true,reviewer_thread_id:reviewer,reviewer_repo_path:source,
    score:8,reason:'Revisão legada desta fixture; não é nota real.',legacy_received:{source:'Fixture de retorno recebido antes de Q8S',status:'FAILED',error_kind:null,
      result_sha256:hash('Fixture de retorno, não avaliação real.'),supervisor_final_sha256:hash('')}};
  for(const patch of [{result_sha256:'b'.repeat(64)},{status:'COMPLETED'},{error_kind:'inventado'},{source:''}]){
    await assert.rejects(()=>callLocalWorker({name:'local_review',args:{...importArgs,legacy_received:{...importArgs.legacy_received,...patch}},serverPath:path.join(fixture,'server.mjs'),env}));
    assert.equal(await fs.stat(path.join(s.jobDir(legacy),'supervisor-review.json')).then(()=>true,()=>false),false);
  }
  const imported=JSON.parse(await callLocalWorker({name:'local_review',args:importArgs,serverPath:path.join(fixture,'server.mjs'),env}));
  assert.equal(imported.assessment.score,8);
  const importRetry=JSON.parse(await callLocalWorker({name:'local_review',args:importArgs,serverPath:path.join(fixture,'server.mjs'),env}));
  assert.equal(importRetry.idempotent,true);
  await assert.rejects(()=>callLocalWorker({name:'local_review',args:{...importArgs,score:9},serverPath:path.join(fixture,'server.mjs'),env}),/já possui/);
  await assert.rejects(()=>callLocalWorker({name:'local_review',args:{...args,reviewer_repo_path:fixture},serverPath:path.join(fixture,'server.mjs'),env}),/outro diretório/);
  await assert.rejects(()=>callLocalWorker({name:'local_review',args,serverPath:path.join(fixture,'server.mjs'),env:{...env,LOCAL_WORKER_JOB_ID:api}}),/supervisor/);
  const monitor=await load('monitor.mjs');
  const ui=await add(),ru=await q.issueReviewReceiptQ8S(ui);
  assert.equal((await monitor.inventorySnapshot({limit:100})).jobs.find(j=>j.job_id===ui).quality.status,'NOT_ASSESSED');
  await q.recordReviewQ8S(make(ui,ru,8,'<script>não executar</script> Evidência de fixture.'));
  let projected=(await monitor.inventorySnapshot({limit:100})).jobs.find(j=>j.job_id===ui).quality;
  assert.equal(projected.assessment.score,8);
  await q.recordReviewQ8S({...make(ui,ru,9,'Revisão posterior desta fixture.'),expected_revision:1});
  projected=(await monitor.inventorySnapshot({limit:100})).jobs.find(j=>j.job_id===ui).quality;
  assert.equal(projected.assessment.score,9);assert.equal(projected.revision_count,2);assert.equal(projected.history,undefined);
  const detail=await monitor.monitorSnapshot(ui);assert.equal(detail.quality.assessment.score,9);assert.equal(detail.quality.history.length,2);
  assert.ok(!JSON.stringify(detail.quality).includes(ru.review.receipt_token));
  await fs.appendFile(path.join(s.jobDir(ui),'result.md'),' mudança posterior');
  assert.equal((await monitor.inventorySnapshot({limit:100})).jobs.find(j=>j.job_id===ui).quality.status,'STALE');
  const {PAGE_M7Q:page}=await load('monitor-page.mjs');
  for(const script of page.split('<script>').slice(1))new vm.Script(script.split('</script>')[0]);
  assert.match(page,/<th>Qualidade<\/th>/);assert.match(page,/id="qualityHistory"/);
  assert.match(page,/renderQuality\(x.quality\)/);assert.match(page,/job.quality/);
  const nodes=new Map();
  const element=()=>({textContent:'',dataset:{},children:[],hidden:false,append(...xs){this.children.push(...xs);},replaceChildren(){this.children=[];}});
  const byId=name=>{if(!nodes.has(name))nodes.set(name,element());return nodes.get(name);};
  const sandbox={document:{createElement:element},byId,put:(k,v)=>{byId(k).textContent=String(v);},fmtDate:v=>v};
  vm.createContext(sandbox);
  new vm.Script(page.slice(page.indexOf('const qualityLabel='),page.indexOf('const resourceLabels='))).runInContext(sandbox);
  sandbox.quality=detail.quality;new vm.Script('renderQuality(quality)').runInContext(sandbox);
  assert.equal(byId('qualityScore').textContent,'9/10');assert.equal(byId('qualityHistory').children.length,2);
  assert.equal(byId('qualityHistory').children[1].children[1].textContent,' — <script>não executar</script> Evidência de fixture.');
  sandbox.quality={status:'STALE',history:detail.quality.history};new vm.Script('renderQuality(quality)').runInContext(sandbox);
  assert.equal(byId('qualityScore').textContent,'Revisão pendente');assert.equal(byId('qualityScore').dataset.band,'none');
  sandbox.quality={status:'UNAVAILABLE',error:'Registro inválido',history:[]};new vm.Script('renderQuality(quality)').runInContext(sandbox);
  assert.equal(byId('qualityScore').textContent,'Indisponível');assert.equal(byId('qualityHistoryBox').hidden,true);
  assert.ok(!(await fs.readdir(s.JOBS)).some(x=>x.endsWith('.lock')));
  console.log('Q8S_OK: receipt, terminal, roles, explicit review, bounds, concurrency, stale, history, delete, retention, real MCP stdio/SQLite, monitor cached updates, DOM safe rendering');
}finally{
  if((await fs.realpath(fixture).catch(()=>null))===canonical&&path.dirname(fixture)===source&&path.basename(fixture).startsWith('.q8s-fixture-'))
    await fs.rm(fixture,{recursive:true,force:true});
}
