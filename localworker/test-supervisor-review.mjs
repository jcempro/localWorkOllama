import assert from 'node:assert/strict';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
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
  await Promise.allSettled([s.pruneJobHistory({force:true}),q.recordReviewQ8S(make(expired,re))]);
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
  await assert.rejects(()=>callLocalWorker({name:'local_review',args:{...args,reviewer_repo_path:fixture},serverPath:path.join(fixture,'server.mjs'),env}),/outro diretório/);
  await assert.rejects(()=>callLocalWorker({name:'local_review',args,serverPath:path.join(fixture,'server.mjs'),env:{...env,LOCAL_WORKER_JOB_ID:api}}),/supervisor/);
  assert.ok(!(await fs.readdir(s.JOBS)).some(x=>x.endsWith('.lock')));
  console.log('Q8S_OK: receipt, terminal, roles, explicit review, bounds, concurrency, stale, history, delete, retention, real MCP stdio/SQLite');
}finally{
  if((await fs.realpath(fixture).catch(()=>null))===canonical&&path.dirname(fixture)===source&&path.basename(fixture).startsWith('.q8s-fixture-'))
    await fs.rm(fixture,{recursive:true,force:true});
}
