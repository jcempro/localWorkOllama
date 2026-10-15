// FT-CONTINUITY-U6C: isolated sensors/CLI; no real chat send, Desktop close or reboot.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {randomUUID} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {DatabaseSync} from 'node:sqlite';
import {sessionReasonU6C,callbackReasonU6C} from '../localworker/continuity.mts';
import {advance,digest} from '../supervisor/core.mts';
const exec=promisify(execFile), base=path.resolve('constructor/audit-private'),root=path.join(base,`continuity-${randomUUID()}`);
const snapshot={schema:1,bootId:'boot-a',desktopInstance:'app-a'},lease={...snapshot,originTurnId:'turn-a'};
assert.equal(sessionReasonU6C(lease,snapshot),null);
for(const [value,reason] of [[{...snapshot,bootId:'boot-b'},'OS_SESSION_CHANGED'],[{...snapshot,desktopInstance:null},'DESKTOP_CLOSED_OR_UNAVAILABLE'],[{...snapshot,desktopInstance:'app-b'},'DESKTOP_INSTANCE_CHANGED']])assert.equal(sessionReasonU6C(lease,value),reason);
assert.equal(callbackReasonU6C(lease,snapshot,{id:'turn-a',status:'completed'}),null);
assert.equal(callbackReasonU6C(lease,snapshot,{id:'turn-b',status:'completed'}),'NEWER_TURN_SUPERSEDES_CALLBACK');
assert.equal(callbackReasonU6C(lease,snapshot,{id:'turn-a',status:'interrupted'}),'ORIGIN_TURN_STOPPED');
assert.equal(sessionReasonU6C(null,snapshot),'AUTHORIZATION_MISSING');
const event={status:'SCHEDULED',dueAt:0,attempts:0,target:{},window:{test:true}};
for(const reason of ['EXPLICIT_PAUSE','OS_SESSION_CHANGED','DESKTOP_CLOSED_OR_UNAVAILABLE','DESKTOP_INSTANCE_CHANGED','EVENT_AUTHORIZATION_EXPIRED','ORIGIN_TURN_FINISHED_OR_STOPPED','NEWER_TURN_SUPERSEDES_EVENT']){
  let effects=0;
  const forbidden=async()=>{effects++;throw Error('FORBIDDEN_EFFECT');};
  const result=await advance(structuredClone(event),{save:async()=>{},continuity:async()=>({allowed:false,reason}),ready:forbidden,recoverDesktop:forbidden,send:forbidden,restoreConversation:forbidden},1);
  assert.equal(result.status,'PAUSED_USER');assert.equal(result.diagnostic,reason);assert.equal(effects,0);
}
let calls=0,sends=0;
const race=await advance(structuredClone(event),{save:async()=>{},identity:async()=>{},continuity:async()=>({allowed:++calls<3,reason:'DESKTOP_CLOSED_OR_UNAVAILABLE'}),quota:async()=>({rateLimits:{primary:{usedPercent:0,resetsAt:2}}}),ready:async()=>{},turns:async()=>[],send:async()=>{sends++;}},1);
assert.equal(race.status,'PAUSED_USER');assert.equal(sends,0); // Closed after readiness/baseline.
await fs.mkdir(root,{recursive:true});
let history:DatabaseSync|undefined;
try{
  for(const name of ['delivery.mjs','job-store.mjs','job-control.mjs'])await fs.copyFile(path.join('localworker',name),path.join(root,name));
  const source=pathToFileURL(path.resolve('localworker/continuity.mjs')).href;
  await fs.writeFile(path.join(root,'continuity.mjs'),`import fs from 'node:fs/promises';import {fileURLToPath}from'node:url';import path from'node:path';import{callbackReasonU6C,latestContinuityTurnU6C}from${JSON.stringify(source)};export{callbackReasonU6C,latestContinuityTurnU6C};export{sessionReasonU6C}from${JSON.stringify(source)};const root=path.dirname(fileURLToPath(import.meta.url));let calls=0;export async function observeContinuityU6C(){const s=JSON.parse(await fs.readFile(path.join(root,'sensor.json')));return s.closeOnSecond&&++calls>=2?{...s,desktopInstance:null}:s}export async function captureContinuityU6C(r,h){return{...await observeContinuityU6C(),originTurnId:latestContinuityTurnU6C(h,r.thread_id,r.repoPath)?.id}}`);
  await fs.writeFile(path.join(root,'fake-cli.mjs'),`import fs from'node:fs';fs.appendFileSync(process.env.CONTINUITY_TEST_QUEUE_U6C,'queued\\n');console.log('fake receipt');`);
  await fs.writeFile(path.join(root,'invoke.mjs'),`import{deliver,resumeDelivery}from'./delivery.mjs';console.log(JSON.stringify(await(process.argv[3]==='resume'?resumeDelivery:deliver)(process.argv[2])));`);
  await fs.writeFile(path.join(root,'config.json'),JSON.stringify({codex_command:process.execPath}));
  const home=path.join(root,'home');await fs.mkdir(home);
  const thread=randomUUID(),repo=process.env.TEST_REPO_PATH;
  if(!repo||path.basename(repo)!=='jeancarloem.com.blog')throw Error('TEST_REPO_PATH required for the authorized target; no target edits');
  const db=new DatabaseSync(path.join(home,'state_5.sqlite'));
  db.exec('CREATE TABLE threads(id TEXT,cwd TEXT,archived INTEGER)');db.prepare('INSERT INTO threads VALUES(?,?,0)').run(thread,repo);db.close();
  history=new DatabaseSync(path.join(home,'thread_history_1.sqlite'));
  history.exec('CREATE TABLE thread_turns(thread_id TEXT,turn_id TEXT,status TEXT,error_json TEXT,started_at INTEGER,rollout_ordinal INTEGER)');
  history.prepare('INSERT INTO thread_turns VALUES(?,?,?,NULL,1,1)').run(thread,'turn-a','completed');
  const env={...process.env,LOCAL_CODEX_CMD:process.execPath,LOCAL_CODEX_HOME:home,LOCAL_DISABLE_NOTIFY:'1',LOCAL_CODEX_PREARGS_JSON:JSON.stringify([path.join(root,'fake-cli.mjs')]),CONTINUITY_TEST_QUEUE_U6C:path.join(root,'queue.log')};
  const make=async(continuity:any=lease,status='COMPLETED')=>{
    const id=randomUUID(),dir=path.join(root,'jobs',id);await fs.mkdir(dir,{recursive:true});
    for(const [name,data]of Object.entries({'state.json':{job_id:id,status},'request.json':{repoPath:repo,thread_id:thread,...(continuity?{continuity}:{})},'delivery.json':{status:'PENDING'}}))await fs.writeFile(path.join(dir,name),JSON.stringify(data));
    return id;
  };
  const invoke=async(id:string,action='deliver')=>JSON.parse((await exec(process.execPath,[path.join(root,'invoke.mjs'),id,action],{env,windowsHide:true,timeout:20_000})).stdout);
  for(const value of [{...snapshot,bootId:'boot-b'},{...snapshot,desktopInstance:null},{...snapshot,desktopInstance:'app-b'},null]){
    await fs.writeFile(path.join(root,'sensor.json'),JSON.stringify(value??snapshot));
    const id=await make(value===null?null:lease);const result=await invoke(id);assert.equal(result.status,'PAUSED_USER');assert.equal(result.not_sent,true);
    assert.equal((await invoke(id)).status,'PAUSED_USER'); // Idempotent, no send.
  }
  await assert.rejects(fs.stat(path.join(root,'queue.log')),{code:'ENOENT'});
  await fs.writeFile(path.join(root,'sensor.json'),JSON.stringify(snapshot));
  history.prepare('UPDATE thread_turns SET status=?').run('interrupted');assert.equal((await invoke(await make())).status,'PAUSED_USER');
  history.prepare('UPDATE thread_turns SET status=?,turn_id=?').run('completed','turn-b');assert.equal((await invoke(await make())).status,'PAUSED_USER');
  history.prepare('UPDATE thread_turns SET status=?,turn_id=?').run('completed','turn-a');
  await fs.writeFile(path.join(root,'sensor.json'),JSON.stringify({...snapshot,closeOnSecond:true}));
  const raced=await invoke(await make());assert.equal(raced.status,'PAUSED_USER');assert.equal(raced.not_sent,true);
  await assert.rejects(fs.stat(path.join(root,'queue.log')),{code:'ENOENT'});
  await fs.writeFile(path.join(root,'sensor.json'),JSON.stringify(snapshot));
  const id=await make();assert.equal((await invoke(id)).status,'QUEUED_TO_CHAT');assert.equal((await invoke(id)).status,'QUEUED_TO_CHAT');
  await assert.rejects(invoke(id,'resume')); // Never replay a sent/uncertain callback.
  assert.equal((await fs.readFile(path.join(root,'queue.log'),'utf8')).trim().split('\n').length,1);
  const paused=await make(null);assert.equal((await invoke(paused)).status,'PAUSED_USER');assert.equal((await invoke(paused,'resume')).status,'QUEUED_TO_CHAT');
  const cancelled=await make(lease,'CANCELLED');assert.equal((await invoke(cancelled)).status,'SUPPRESSED_CANCELLED');
  assert.equal((await fs.readFile(path.join(root,'queue.log'),'utf8')).trim().split('\n').length,2);
  // Full SR runtime, isolated RPC/sensor/platform: boot/close paths must not connect or launch.
  history.exec('ALTER TABLE thread_turns ADD COLUMN completed_at INTEGER');
  const sr=path.join(root,'supervisor');await fs.mkdir(sr);
  for(const name of ['run.mjs','core.mjs','receipts.mjs'])await fs.copyFile(path.join('src/supervisor',name),path.join(sr,name));
  await fs.copyFile(path.join(root,'continuity.mjs'),path.join(sr,'continuity.mjs'));
  const account={type:'chatgpt',id:'isolated-test'};
  const cfg={schema:1,threadId:thread,repoPath:repo,codexHome:home,accountKey:digest(account),mutexName:'test-only',powershell:path.join(process.env.SystemRoot!,'System32/WindowsPowerShell/v1.0/powershell.exe')};
  await fs.writeFile(path.join(sr,'config.json'),JSON.stringify(cfg));await fs.mkdir(path.join(sr,'events'));
  await fs.writeFile(path.join(sr,'rpc.mjs'),`import fs from'node:fs/promises';import path from'node:path';import{fileURLToPath}from'node:url';const root=path.dirname(fileURLToPath(import.meta.url));export async function connect(){await fs.appendFile(path.join(root,'rpc.log'),'connect\\n');return{read:async(name)=>{if(name==='account/read')return{account:${JSON.stringify(account)}};if(name==='account/rateLimits/read')return{rateLimits:{primary:{usedPercent:95,resetsAt:Math.ceil(Date.now()/1000)+100}}};throw Error('UNEXPECTED_RPC:'+name)},close(){}}}`);
  await fs.writeFile(path.join(sr,'platform.ps1'),`param([string]$Action,[string]$Config,[string]$EventId)\nif($Action -ne 'Unschedule'){throw 'FORBIDDEN_EFFECT'}\nAdd-Content -LiteralPath (Join-Path $PSScriptRoot 'platform.log') -Value $Action\n`);
  const tick=async(...args:string[])=>exec(process.execPath,[path.join(sr,'run.mjs'),...args],{env:{...env,SUPERVISOR_MUTEX_S8R:'test-only'},windowsHide:true,timeout:20_000});
  for(const sensor of [{...snapshot,bootId:'boot-b'},{...snapshot,desktopInstance:null},{...snapshot,desktopInstance:'app-b'}]){
    await fs.writeFile(path.join(sr,'continuity.json'),JSON.stringify({schema:1,mode:'ACTIVE',session:snapshot,generation:'g1'}));
    await fs.writeFile(path.join(sr,'sensor.json'),JSON.stringify(sensor));
    assert.match((await tick()).stdout,/PAUSED_USER/);
    await assert.rejects(fs.stat(path.join(sr,'rpc.log')),{code:'ENOENT'});
    await fs.writeFile(path.join(sr,'sensor.json'),JSON.stringify(snapshot));
    assert.match((await tick()).stdout,/PAUSED_USER/); // Opening again cannot rearm.
  }
  await fs.unlink(path.join(sr,'continuity.json'));assert.match((await tick()).stdout,/PAUSED_USER/); // Legacy install.
  assert.match((await tick('--pause')).stdout,/PAUSED/);
  assert.match((await tick('--resume')).stdout,/ACTIVE/); // Explicit rearm, no send.
  await assert.rejects(fs.stat(path.join(sr,'rpc.log')),{code:'ENOENT'});
  assert.match((await tick()).stdout,/MONITORING/);
  assert.equal((await fs.readdir(path.join(sr,'events'))).length,0); // Low quota + completed task != obligation.
  await assert.rejects(fs.stat(path.join(sr,'platform.log')),{code:'ENOENT'});
  const legacyId='a'.repeat(64);
  await fs.writeFile(path.join(sr,'events',`${legacyId}.json`),JSON.stringify({schema:1,id:legacyId,status:'SCHEDULED',target:{threadId:thread,repoPath:repo,accountKey:cfg.accountKey},window:{test:true},dueAt:0,attempts:0}));
  await tick();assert.equal(JSON.parse(await fs.readFile(path.join(sr,'events',`${legacyId}.json`),'utf8')).status,'PAUSED_USER');
  assert.equal((await fs.readFile(path.join(sr,'platform.log'),'utf8')).trim(),'Unschedule');
  history.close();history=undefined;
  console.log('PASS U6C: boot/app/legacy/pause/turn/close-during-send; actual isolated delivery and explicit resume; no real sends or target edits');
}finally{
  history?.close();
  const actual=await fs.realpath(root);if(!actual.startsWith(base+path.sep)||path.basename(actual)!==path.basename(root))throw Error('UNSAFE_FIXTURE_CLEANUP');
  await fs.rm(actual,{recursive:true,force:true});
}
