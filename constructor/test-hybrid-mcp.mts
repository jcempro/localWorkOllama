// MCP real: contratos rejeitados e aceitos chegam à guarda de chat; nenhum job é criado.
import {promises as fs} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {spawn} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
import assert from 'node:assert/strict';
import {scopeHashS4W} from '../localworker/delegation-policy.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const repo=process.env.TEST_REPO_PATH;
if(!repo||path.basename(path.resolve(repo)).toLowerCase()!=='jeancarloem.com.blog')throw Error('Use o único alvo de teste autorizado');
const fixture=path.join(root,'localworker','jobs','.hybrid-mcp-'+randomUUID());
await fs.mkdir(fixture,{recursive:true});
for(const name of await fs.readdir(path.join(root,'localworker')))if(name.endsWith('.mjs'))await fs.copyFile(path.join(root,'localworker',name),path.join(fixture,name));
const id=randomUUID(),thread=randomUUID(),home=path.join(fixture,'codex');await fs.mkdir(home);
const db=new DatabaseSync(path.join(home,'state_5.sqlite'));db.exec('CREATE TABLE threads (id TEXT PRIMARY KEY,archived INTEGER,cwd TEXT)');db.prepare('INSERT INTO threads VALUES (?,?,?)').run(thread,1,repo);db.close();
await fs.writeFile(path.join(fixture,'config.json'),JSON.stringify({maintenance_repo:repo,maintenance_id:id,maintenance_hybrid_version:1}));
const child=spawn(process.execPath,[path.join(fixture,'server.mjs')],{windowsHide:true,stdio:['pipe','pipe','pipe'],env:{...process.env,LOCAL_WORKER_MAINTENANCE_REPO:repo,LOCAL_WORKER_MAINTENANCE_ID:id,LOCAL_CODEX_HOME:home,LOCAL_WORKER_ROOT:fixture}});
let seq=0,buffer='',diagnostic='';const waits=new Map<number,any>();
child.stderr.on('data',b=>diagnostic+=b);
child.stdout.on('data',b=>{buffer+=b;let i;while((i=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,i);buffer=buffer.slice(i+1);if(!line.trim())continue;const item=JSON.parse(line);waits.get(item.id)?.(item);waits.delete(item.id);}});
const rpc=(method:string,params:any)=>new Promise<any>((resolve,reject)=>{const n=++seq;const timer=setTimeout(()=>{waits.delete(n);reject(Error('MCP timeout: '+diagnostic.slice(-500)));},15000);waits.set(n,item=>{clearTimeout(timer);resolve(item);});child.stdin.write(JSON.stringify({jsonrpc:'2.0',id:n,method,params})+'\n');});
const req=(c:number,regime='junior'):any=>{const r:any={repoPath:repo,thread_id:thread,task:'Consulta factual delimitada de fixture; chat arquivado impede criação.',mode:'read-only',commit_policy:'supervisor',maintenance_supervision:{version:1,criticality:c,regime,uncertainty_resolved:true,rationale:'Decisão exclusiva do supervisor para fixture técnica.',evidence:'Contrato pré-inspecionado, sem inferência/efeitos de job.',scope_paths:['package.json'],scope_sha256:''}};r.maintenance_supervision.scope_sha256=scopeHashS4W(r);return r;};
const call=async(r:any)=>JSON.stringify((await rpc('tools/call',{name:'local_analyze',arguments:r})).result);
try{
  assert.ok((await rpc('initialize',{protocolVersion:'2024-11-05',capabilities:{},clientInfo:{name:'hybrid-fixture',version:'1'}})).result);
  child.stdin.write(JSON.stringify({jsonrpc:'2.0',method:'notifications/initialized'})+'\n');
  for(const c of [0,5,7])assert.match(await call(req(c)),/conversa arquivada/,'Avaliação válida passa até guarda de chat');
  assert.match(await call(req(7,'intern')),/conversa arquivada/,'Estagiário factual usa mesmo MCP');
  for(const c of [7.01,10])assert.match(await call(req(c)),/Supervisor exclusivo/);
  assert.match(await call(req(5,'intern')),/Regime incompatível/);
  assert.match(await call(req(6,'exclusive')),/Supervisor exclusivo/);
  const expanded=req(3);expanded.task+=' expansão';assert.match(await call(expanded),/Escopo mudou/);
  const uncertain=req(3);uncertain.maintenance_supervision.uncertainty_resolved=false;assert.match(await call(uncertain),/Incerteza/);
  const missing=req(3);delete missing.maintenance_supervision;assert.match(await call(missing),/Avaliação exclusiva/);
  const jobs=await fs.readdir(path.join(fixture,'jobs')).catch(e=>{if(e.code==='ENOENT')return [];throw e;});assert.deepEqual(jobs,[]);
  console.log('hybrid MCP: schema real, defaults/hash, limites exatos, incerteza, escopo e nenhuma criação de job OK');
}finally{
  if(child.exitCode===null){const exited=new Promise(r=>child.once('exit',r));child.kill();await exited;}
  const real=await fs.realpath(fixture);assert.equal(path.dirname(real),await fs.realpath(path.join(root,'localworker','jobs')));
  await fs.rm(real,{recursive:true,force:true});
}
