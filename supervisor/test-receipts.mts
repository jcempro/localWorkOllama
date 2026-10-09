import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { parseQueueReceipt, clientIds, observeQueue, persistedTurn } from './receipts.mts';
import { responseEvidence } from './core.mts';
const thread='11111111-1111-4111-8111-111111111111';
const queue='22222222-2222-4222-8222-222222222222';
const client='33333333-3333-4333-8333-333333333333';
assert.equal(parseQueueReceipt(`Queued message ${queue} for thread ${thread}.`,thread),queue);
assert.equal(parseQueueReceipt(`Queued message ${queue} for thread ${thread}.`,queue),null);
assert.deepEqual(clientIds({id:queue,nested:{clientId:client}}),[client]);
const root=await fs.mkdtemp(path.join(os.tmpdir(),'supervisor-receipts-'));
let observer:any,db:DatabaseSync|undefined;
try{
  db=new DatabaseSync(path.join(root,'queue_1.sqlite'));
  db.exec('CREATE TABLE queued_items(id TEXT PRIMARY KEY,thread_id TEXT,payload_json TEXT)');
  observer=observeQueue({codexHome:root,threadId:thread});
  db.prepare('INSERT INTO queued_items VALUES(?,?,?)').run(queue,thread,JSON.stringify({clientId:client}));
  await new Promise(r=>setTimeout(r,150));
  assert.equal(observer.messageClientId(queue),client);
  observer.close();observer=null;db.close();
  db=new DatabaseSync(path.join(root,'thread_history_1.sqlite'));
  db.exec('CREATE TABLE thread_turns(thread_id TEXT,turn_id TEXT,status TEXT,error_json TEXT,first_user_item_id TEXT,final_agent_item_id TEXT); CREATE TABLE thread_items(thread_id TEXT,turn_id TEXT,item_id TEXT,item_json TEXT)');
  const user={id:'server-user-id',clientId:client,type:'userMessage',content:[{type:'text',text:'continue'}]};
  const final={id:'answer-id',type:'agentMessage',phase:'final',text:'Retomada real confirmada.'};
  db.prepare('INSERT INTO thread_turns VALUES(?,?,?,?,?,?)').run(thread,'turn','inProgress',null,user.id,null);
  db.prepare('INSERT INTO thread_items VALUES(?,?,?,?)').run(thread,'turn',user.id,JSON.stringify(user));
  assert.equal(persistedTurn({codexHome:root,threadId:thread},'turn')?.status,'inProgress');
  db.prepare('UPDATE thread_turns SET status=?,final_agent_item_id=?').run('completed',final.id);
  db.prepare('INSERT INTO thread_items VALUES(?,?,?,?)').run(thread,'turn',final.id,JSON.stringify(final));
  const turn={...persistedTurn({codexHome:root,threadId:thread},'turn'),id:'turn',startedAt:1};
  const event={baselineTurns:[],sendStartedAt:1000,messageClientId:client};
  assert.equal(responseEvidence(event,[turn]).status,'COMPLETED');
  const manual={...turn,id:'manual',items:[{...user,clientId:thread},final]};
  assert.equal(responseEvidence(event,[manual,turn]).status,'COMPLETED');
  assert.equal(responseEvidence({...event,messageClientId:queue},[turn]).status,'AWAITING_RESPONSE');
  console.log('PASS: recibo da fila != ID recebido; correlacao clientId, schema ausente, projecao real, resposta e isolamento');
}finally{
  observer?.close();db?.close();
  // Exclusivamente os dois bancos criados por este teste, sem remocao recursiva.
  for(const name of ['queue_1.sqlite','thread_history_1.sqlite'])await fs.unlink(path.join(root,name)).catch(()=>{});
  await fs.rmdir(root);
}
