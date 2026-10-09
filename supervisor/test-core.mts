import assert from 'node:assert/strict';
import { detect, advance, responseEvidence, planCycles } from './core.mts';
const now = 2_000_000;
const target = { accountKey: 'test', threadId: 'thread-a', repoPath: 'repo' };
const quota = (used = 90, reset = now / 1000 + 100) => ({ rateLimitsByLimitId: { codex: { primary: { usedPercent: used, resetsAt: reset } } } });
assert.equal(detect(quota(89), target, now).length, 0);
const seed = detect(quota(), target, now)[0];
const ledger:any={};
const first=planCycles(quota(),target,ledger,[],now)[0];
const refined=planCycles(quota(100,now/1000+101),target,ledger,[first],now+1000)[0];
assert.equal(first.id,refined.id);assert.equal(refined.dueAt,first.dueAt+1000);
const sentCycle={...refined,sendStartedAt:now+2000,status:'SENT'};
assert.equal(planCycles(quota(100,now/1000+102),target,ledger,[sentCycle],now+3000).length,0);
planCycles(quota(0,now/1000+19000),target,ledger,[sentCycle],now+200000);
const later=planCycles(quota(90,now/1000+19000),target,ledger,[sentCycle],now+300000)[0];
assert.notEqual(later.id,first.id);
assert.equal(seed.dueAt, now + 160_000);
assert.equal(seed.id, detect(quota(), target, now)[0].id);
const dual=quota();dual.rateLimitsByLimitId.codex.secondary={...dual.rateLimitsByLimitId.codex.primary};
assert.equal(detect(dual,target,now)[0].id,detect(dual,target,now)[1].id);
assert.notEqual(seed.id, detect(quota(), { ...target, threadId: 'thread-b' }, now)[0].id);
assert.throws(() => detect(quota(90, null), target, now), /RESET_TIME/);
assert.equal(detect({ rateLimits: { primary: null } }, target, now).length, 0);
let sent = 0, ready = 0, saved: any[] = [], turns: any[] = [];
const io: any = { now: () => seed.dueAt, save: async (e: any) => saved.push(structuredClone(e)), identity: async () => {}, recoverDesktop: async () => {},
  quota: async () => quota(1), ready: async () => { ready++; }, turns: async () => turns,
  send: async (_t: any, text: string) => { assert.equal(text, 'continue'); assert.equal(saved.at(-1).status, 'SENDING'); sent++; return { messageId: 'u1' }; } };
await advance(structuredClone(seed), io, seed.dueAt - 1); assert.equal(sent, 0);
let e = await advance(structuredClone(seed), io, seed.dueAt); assert.equal(sent, 1); assert.equal(e.status, 'SENT');
turns = [{ id: 'new', startedAt: seed.dueAt / 1000, status: 'completed', error: null, items: [
  {type:'userMessage',id:'u1',content:[{type:'text',text:'continue'}]}, {type:'agentMessage',id:'a1',phase:'final',text:'Resposta real'}] }];
e = await advance(e, io, seed.dueAt + 60_000); assert.equal(e.status, 'COMPLETED');
await advance(e, io, seed.dueAt + 900_000); assert.equal(sent, 1);
assert.equal(responseEvidence({...e, messageId:null}, turns).status, 'RESPONSE_OBSERVED_UNCORRELATED');
assert.equal(responseEvidence(e, [{...turns[0],error:{message:'quota'},status:'failed'}]).status, 'RESPONSE_ERROR');
assert.equal(responseEvidence(e, [{...turns[0],items:[turns[0].items[0]]}]).status, 'RECEIVED');
assert.equal(responseEvidence(e, [turns[0],{...turns[0],id:'other'}]).status, 'AMBIGUOUS_RESPONSE');
for (const stage of ['identity','quota','ready']) {
  const broken = {...io,[stage]: async () => { throw new Error(stage === 'identity' ? 'SESSION_EXPIRED' : 'OFFLINE_OR_DEPENDENCY_ABSENT'); }};
  const s = await advance(structuredClone(seed), broken, seed.dueAt); assert.equal(s.status,'RETRY'); assert.equal(sent,1);
  const repaired = await advance(s, io, s.nextAttemptAt); assert.equal(repaired.status,'SENT');
  sent = 1;
}
e = await advance(structuredClone(seed), {...io,send:async()=>{throw new Error('CONNECTION_LOST_AFTER_SEND');}},seed.dueAt);
assert.equal(e.status,'SEND_AMBIGUOUS'); turns = [];
await advance(e,io,e.nextAttemptAt); assert.equal(sent,1); // Restart/crash cannot resend.
e = await advance(structuredClone(seed), {...io,quota:async()=>quota(100)}, seed.dueAt);
assert.equal(e.status,'WAITING_QUOTA'); assert.equal(sent,1);
e = await advance(structuredClone(seed), {...io,quota:async()=>quota(90)},seed.dueAt);
assert.equal(e.status,'WAITING_QUOTA'); assert.equal(e.diagnostic,'RESET_NOT_YET_OBSERVED');
e = await advance(structuredClone(seed), {...io,send:async()=>{throw Object.assign(new Error('ENOENT'),{code:'SEND_NOT_STARTED'});}},seed.dueAt);
assert.equal(e.status,'RETRY'); assert.equal(e.sendStartedAt,undefined);
e=await advance({...seed,sendStartedAt:seed.dueAt,baselineTurns:[]}, {...io,turns:async()=>{throw new Error('HISTORY_TEMPORARILY_UNAVAILABLE');}},seed.dueAt);
assert.equal(e.status,'CONFIRMATION_RETRY');assert.equal(e.errorStage,'confirmation');assert.equal(sent,1);
console.log('PASS: limiar, horario, isolamento, persistencia, reboot logico, prontidao, quota, sessao, rede, envio ambiguo, resposta/eco/erro e idempotencia');
