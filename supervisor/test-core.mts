import assert from 'node:assert/strict';
import { detect, advance, responseEvidence, planCycles, planQuotaFailure, planServiceFailureC9R, dispatchDecisionC9R } from './core.mts';
import { callbackReasonU6C,causalSuspensionC9R,quotaSuspensionC9R } from './continuity.mts';
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
  continuity:async()=>({allowed:true}),
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

const incident={id:'failed-quota-turn',status:'failed',completedAt:now/1000-10,error:{codexErrorInfo:'usageLimitExceeded'}};
const catchup=planQuotaFailure(quota(1),target,incident,[],now)[0];
assert.equal(catchup.dueAt,now);assert.equal(catchup.scheduleReason,'RECOVERED_QUOTA_CATCH_UP');
assert.equal(planQuotaFailure(quota(1),target,incident,[catchup],now+1000).length,0);
assert.equal(planQuotaFailure(quota(1),target,{...incident,status:'completed'},[],now).length,0);
assert.equal(planQuotaFailure(quota(1),target,{...incident,error:{message:'usage limit'}},[],now).length,0);
assert.equal(planQuotaFailure(quota(1),target,{...incident,error:{codexErrorInfo:'other'}},[],now).length,0);
assert.throws(()=>planQuotaFailure({},target,incident,[],now),/QUOTA_UNAVAILABLE/);
assert.equal(planQuotaFailure(quota(100),target,incident,[],now)[0].dueAt,seed.dueAt);
assert.equal(planQuotaFailure(quota(100),target,incident,[seed],now)[0].id,seed.id);
assert.equal(planQuotaFailure(quota(1),target,incident,[{...seed,sendStartedAt:now}],now).length,0);
const beforeCatchup=sent;
const recovered=await advance(structuredClone(catchup),{...io,incidentCurrent:async()=>true},now);
assert.equal(recovered.status,'SENT');assert.equal(sent,beforeCatchup+1);
await advance(recovered,{...io,incidentCurrent:async()=>true},recovered.nextAttemptAt);
assert.equal(sent,beforeCatchup+1);
const superseded=await advance(structuredClone(catchup),{...io,incidentCurrent:async()=>false},now);
assert.equal(superseded.status,'RESOLVED_EXTERNALLY');assert.equal(sent,beforeCatchup+1);
let checks=0;
const raced=await advance(structuredClone(catchup),{...io,incidentCurrent:async()=>++checks===1},now);
assert.equal(raced.status,'RESOLVED_EXTERNALLY');assert.equal(sent,beforeCatchup+1);
console.log('PASS: falha de cota tipada, instalacao tardia, agenda existente, envio unico e continuacao manual concorrente');

turns=[];let activated=0,desktopInstance='instance-a';
const activationIo={...io,restoreConversation:async(event: any)=>{
  if(event.conversationActivation?.desktopInstance===desktopInstance)return null;
  activated++;return {desktopInstance,at:seed.dueAt,count:activated};
},continuity:async()=>({allowed:desktopInstance==='instance-a',reason:'DESKTOP_INSTANCE_CHANGED'})};
const beforeActivation=sent;
let pending=await advance(structuredClone(seed),activationIo,seed.dueAt);
assert.equal(pending.status,'SENT');assert.equal(activated,1);assert.equal(sent,beforeActivation+1);
pending=await advance(pending,activationIo,pending.nextAttemptAt);
assert.equal(pending.status,'AWAITING_RESPONSE');assert.equal(activated,1);assert.equal(sent,beforeActivation+1);
desktopInstance='instance-b';
pending=await advance(pending,activationIo,pending.nextAttemptAt);
assert.equal(activated,1);assert.equal(pending.status,'PAUSED_USER');assert.equal(sent,beforeActivation+1);
desktopInstance='instance-a';
const restoreFailure={...activationIo,restoreConversation:async()=>{throw Error('DESKTOP_PROTOCOL_UNAVAILABLE');}};
pending=await advance(structuredClone(seed),restoreFailure,seed.dueAt);
assert.equal(pending.status,'CONFIRMATION_RETRY');assert.equal(pending.sendAttempts,1);
await advance(pending,activationIo,pending.nextAttemptAt);assert.equal(pending.sendAttempts,1);
console.log('PASS: conversa autorizada ativada uma vez, nova instancia pausada, falha rastreavel e sem reenvio');

// C9R: quota esgotada -> estado persistido -> restauração -> envio único -> resposta.
const sessionC9R={schema:1,bootId:'same-boot',desktopInstance:'same-app'};
const leaseC9R={...sessionC9R,originTurnId:incident.id};
let originC9R:any={...incident}, usedC9R=100, sendsC9R=0, receivedC9R:any[]=[];
let persistedC9R:any;
const causalIo={...io,now:()=>seed.dueAt,quota:async()=>quota(usedC9R),
  continuity:async()=>{const reason=callbackReasonU6C(leaseC9R,sessionC9R,originC9R);return {allowed:!reason,reason};},
  incidentCurrent:async(id:string)=>originC9R.id===id,
  save:async(value:any)=>{persistedC9R=JSON.parse(JSON.stringify(value));},turns:async()=>receivedC9R,
  send:async(_target:any,text:string)=>{assert.equal(text,'continue');sendsC9R++;return {messageId:'causal-receipt'};}};
await advance(planQuotaFailure(quota(100),target,incident,[],now)[0],causalIo,seed.dueAt);
assert.equal(persistedC9R.status,'WAITING_QUOTA');assert.equal(sendsC9R,0);
usedC9R=0;
await advance(structuredClone(persistedC9R),causalIo,persistedC9R.nextAttemptAt);
assert.equal(persistedC9R.status,'SENT');assert.equal(sendsC9R,1);
await advance(structuredClone(persistedC9R),causalIo,persistedC9R.nextAttemptAt);
assert.equal(persistedC9R.status,'AWAITING_RESPONSE');assert.equal(sendsC9R,1);
receivedC9R=[{id:'response-c9r',startedAt:seed.dueAt/1000,status:'completed',items:[
  {type:'userMessage',id:'causal-receipt',content:[{type:'text',text:'continue'}]},
  {type:'agentMessage',id:'actual-response-c9r',phase:'final',text:'Continuação efetivamente executada'}]}];
await advance(structuredClone(persistedC9R),causalIo,persistedC9R.nextAttemptAt);
assert.equal(persistedC9R.status,'COMPLETED');assert.equal(sendsC9R,1);
originC9R={...incident,status:'interrupted'};
const stoppedC9R=await advance(structuredClone(catchup),causalIo,seed.dueAt);
assert.equal(stoppedC9R.status,'PAUSED_USER');assert.equal(sendsC9R,1);
originC9R=incident;
await advance(stoppedC9R,causalIo,seed.dueAt+999999); // Restored quota never rearms manual pause.
assert.equal(stoppedC9R.status,'PAUSED_USER');assert.equal(sendsC9R,1);
console.log('PASS C9R: causa tipada preservada, quota esgotada/restaurada, persistencia, envio unico, resposta confirmada e interrupcao sem rearme');

const dispatchSeedC9R={...seed,originTurnId:'shared-origin',window:{test:true}};
let persistedEventsC9R:any[]=[];let queueBusyC9R=false,dispatchesC9R=0;
const dispatchIoC9R={...io,turns:async()=>[],
  save:async(e:any)=>{persistedEventsC9R=[...persistedEventsC9R.filter(x=>x.id!==e.id),JSON.parse(JSON.stringify(e))];},
  dispatchGuard:async(e:any)=>dispatchDecisionC9R(e,persistedEventsC9R,queueBusyC9R),
  send:async()=>{dispatchesC9R++;assert.ok(persistedEventsC9R.some(e=>e.status==='SENDING'));return {messageId:'one-only'};}};
const firstDispatchC9R=await advance({...dispatchSeedC9R,id:'window-one'},dispatchIoC9R,seed.dueAt);
const secondDispatchC9R=await advance({...dispatchSeedC9R,id:'window-two'},dispatchIoC9R,seed.dueAt);
assert.equal(firstDispatchC9R.status,'SENT');assert.equal(secondDispatchC9R.status,'RESOLVED_EXTERNALLY');assert.equal(dispatchesC9R,1);
assert.equal(dispatchDecisionC9R({...dispatchSeedC9R,id:'third'},[{...firstDispatchC9R,status:'SEND_AMBIGUOUS'}],false).allowed,false);
assert.equal(dispatchDecisionC9R({...dispatchSeedC9R,id:'third',originTurnId:'other-origin'},[firstDispatchC9R],false).allowed,true);
assert.equal(dispatchDecisionC9R({...dispatchSeedC9R,id:'third',target:{...target,threadId:'other'}},[firstDispatchC9R],false).allowed,true);
persistedEventsC9R=[];queueBusyC9R=true;
const queuedWaitC9R=await advance({...dispatchSeedC9R,id:'queue-wait'},dispatchIoC9R,seed.dueAt);
assert.equal(queuedWaitC9R.status,'WAITING_QUEUED_INPUT');assert.equal(dispatchesC9R,1);
queueBusyC9R=false;
assert.equal((await advance(JSON.parse(JSON.stringify(queuedWaitC9R)),dispatchIoC9R,queuedWaitC9R.nextAttemptAt)).status,'SENT');
assert.equal(dispatchesC9R,2);
console.log('PASS C9R: duas janelas/origem, reserva persistida/ambigua, isolamento e fila pendente/liberada sem duplicacao');

const serviceTurnC9R={...incident,error:{codexErrorInfo:'serverOverloaded'}};
assert.equal(causalSuspensionC9R(serviceTurnC9R),'SERVICE_OVERLOAD');assert.equal(quotaSuspensionC9R(serviceTurnC9R),false);
assert.equal(callbackReasonU6C({...sessionC9R,originTurnId:serviceTurnC9R.id},sessionC9R,serviceTurnC9R),null);
for(const code of ['other','toString','__proto__'])assert.equal(causalSuspensionC9R({...serviceTurnC9R,error:{codexErrorInfo:code}}),null);
assert.equal(causalSuspensionC9R({...serviceTurnC9R,status:'interrupted'}),null);
assert.equal(causalSuspensionC9R({...serviceTurnC9R,error:{message:'serverOverloaded'}}),null);
let serviceEventC9R=planServiceFailureC9R(target,serviceTurnC9R,[],now,'generation-a')[0];
assert.equal(serviceEventC9R.dueAt,serviceTurnC9R.completedAt*1000+30_000);
assert.equal(serviceEventC9R.scheduleReason,'STRUCTURED_SERVICE_BACKOFF');
assert.equal(planServiceFailureC9R(target,serviceTurnC9R,[serviceEventC9R],now,'generation-a').length,0);
const unconfirmedServiceC9R=Array.from({length:8},(_,i)=>({...serviceEventC9R,id:'prior-'+i,interruptedTurnId:'prior-origin-'+i,
  sendStartedAt:now-50_000,continuity:{generation:'generation-a'},status:'RESPONSE_ERROR'}));
assert.equal(planServiceFailureC9R(target,serviceTurnC9R,unconfirmedServiceC9R,now,'generation-a')[0].recoveryDelayMs,900_000);
assert.equal(planServiceFailureC9R(target,serviceTurnC9R,unconfirmedServiceC9R,now,'new-generation')[0].recoveryDelayMs,30_000);
assert.equal(planServiceFailureC9R(target,{...serviceTurnC9R,status:'interrupted'},[],now,'generation-a').length,0);
assert.equal(planServiceFailureC9R(target,incident,[],now,'generation-a').length,0);
let serviceSendsC9R=0;
const serviceIoC9R={...io,incidentCurrent:async()=>true,turns:async()=>[],send:async()=>{serviceSendsC9R++;return {messageId:'service-receipt'};}};
await advance(serviceEventC9R,serviceIoC9R,serviceEventC9R.dueAt-1);assert.equal(serviceSendsC9R,0);
serviceEventC9R=await advance(serviceEventC9R,serviceIoC9R,serviceEventC9R.dueAt);
assert.equal(serviceEventC9R.status,'SENT');assert.equal(serviceSendsC9R,1);
await advance(serviceEventC9R,serviceIoC9R,serviceEventC9R.nextAttemptAt);assert.equal(serviceSendsC9R,1);
const quotaBlockedServiceC9R=await advance(planServiceFailureC9R(target,serviceTurnC9R,[],now,'generation-a')[0],{...serviceIoC9R,quota:async()=>quota(100)},now+60_000);
assert.equal(quotaBlockedServiceC9R.status,'WAITING_QUOTA');assert.equal(serviceSendsC9R,1);
console.log('PASS C9R: sobrecarga estruturada distinta de quota, backoff limitado, incidente unico, bloqueio de erros genericos/interrupcao e sem reenvio');

const scopedLedgerC9R:any={};
const oldCycleC9R=planCycles(quota(),target,scopedLedgerC9R,[],now,'old-authorization-origin')[0];
const pausedCycleC9R={...oldCycleC9R,status:'PAUSED_USER'};
const preservedPausedC9R=JSON.stringify(pausedCycleC9R);
const newCycleC9R=planCycles(quota(),target,scopedLedgerC9R,[],now,'new-authorization-origin')[0];
assert.notEqual(newCycleC9R.id,oldCycleC9R.id);assert.equal(newCycleC9R.dueAt,oldCycleC9R.dueAt);
assert.equal(planCycles(quota(),target,scopedLedgerC9R,[newCycleC9R],now+1000,'new-authorization-origin')[0].id,newCycleC9R.id);
assert.notEqual(planQuotaFailure(quota(1),target,incident,[pausedCycleC9R],now)[0].id,pausedCycleC9R.id);
for(let i=0;i<100;i++)planCycles(quota(),target,scopedLedgerC9R,[],now,'fresh-context-'+i);
assert.equal(Object.keys(scopedLedgerC9R.windows).length,1);
assert.equal(JSON.stringify(pausedCycleC9R),preservedPausedC9R);
console.log('PASS C9R: episodio vinculado a autorizacao/origem, pausa antiga preservada e cache limitado a janela');
const causalPriorityC9R={...dispatchSeedC9R,id:'service-recovery',interruptedTurnId:dispatchSeedC9R.originTurnId,status:'SCHEDULED',detectedAt:now};
assert.equal(dispatchDecisionC9R({...dispatchSeedC9R,id:'proactive-quota'},[causalPriorityC9R],false).reason,'ORIGIN_HAS_CAUSAL_RECOVERY');
assert.equal(dispatchDecisionC9R(causalPriorityC9R,[causalPriorityC9R],false).allowed,true);
assert.equal(dispatchDecisionC9R({...dispatchSeedC9R,id:'other-context',continuity:{generation:'fresh'}},[{...causalPriorityC9R,continuity:{generation:'old'}}],false).allowed,true);

// Restauração antes do prazo persistido deve replanejar o MESMO incidente.
const earlyQuotaC9R=planQuotaFailure(quota(100),target,incident,[],now)[0];
const earlyObservedC9R=now+10_000;
const earlyRecoveredC9R=planQuotaFailure(quota(0),target,incident,[earlyQuotaC9R],earlyObservedC9R)[0];
assert.ok(earlyRecoveredC9R,'restauracao antecipada nao pode desaparecer por incidente ja existente');
assert.equal(earlyRecoveredC9R.id,earlyQuotaC9R.id);
assert.equal(earlyRecoveredC9R.dueAt,earlyObservedC9R+60_000);
assert.equal(earlyRecoveredC9R.nextAttemptAt,earlyRecoveredC9R.dueAt);
assert.equal(earlyRecoveredC9R.scheduleReason,'OBSERVED_QUOTA_RECOVERY');
assert.equal(planQuotaFailure(quota(0),target,incident,[earlyRecoveredC9R],earlyObservedC9R+1000).length,0);
for(const status of ['PAUSED_USER','COMPLETED','RESOLVED_EXTERNALLY','SEND_AMBIGUOUS','RETRY']){
  assert.equal(planQuotaFailure(quota(0),target,incident,[{...earlyQuotaC9R,status}],earlyObservedC9R).length,0);
}
assert.equal(planQuotaFailure(quota(0),target,incident,[{...earlyQuotaC9R,sendStartedAt:now}],earlyObservedC9R).length,0);
assert.equal(planQuotaFailure(quota(95),target,incident,[earlyQuotaC9R],earlyObservedC9R).length,0);
assert.throws(()=>planQuotaFailure({},target,incident,[earlyQuotaC9R],earlyObservedC9R),/QUOTA_UNAVAILABLE/);
assert.equal(planQuotaFailure(quota(0),target,incident,[{...earlyQuotaC9R,target:{...target,threadId:'other-chat'}}],earlyObservedC9R)[0].scheduleReason,'RECOVERED_QUOTA_CATCH_UP');
// Deadline oficial já próximo não é adiado; só um retry de quota obsoleto é retirado.
const waitingEarlyC9R={...earlyQuotaC9R,status:'WAITING_QUOTA',nextAttemptAt:earlyQuotaC9R.dueAt+3_600_000};
const restoredWaitingC9R=planQuotaFailure(quota(0),target,incident,[waitingEarlyC9R],earlyQuotaC9R.dueAt-10_000)[0];
assert.equal(restoredWaitingC9R.dueAt,earlyQuotaC9R.dueAt);
assert.equal(restoredWaitingC9R.nextAttemptAt,earlyQuotaC9R.dueAt);
let earlySendsC9R=0;
const earlyIoC9R={...io,turns:async()=>[],incidentCurrent:async()=>true,send:async()=>{earlySendsC9R++;return {messageId:'early-receipt'};}};
await advance(structuredClone(earlyRecoveredC9R),earlyIoC9R,earlyRecoveredC9R.dueAt-1);assert.equal(earlySendsC9R,0);
const earlySentC9R=await advance(JSON.parse(JSON.stringify(earlyRecoveredC9R)),earlyIoC9R,earlyRecoveredC9R.dueAt);
assert.equal(earlySentC9R.status,'SENT');assert.equal(earlySendsC9R,1);
await advance(earlySentC9R,earlyIoC9R,earlySentC9R.nextAttemptAt);assert.equal(earlySendsC9R,1);
console.log('PASS C9R: restauracao antecipada, deadline/retry persistidos sem deslizar, pausa/envio preservados e continuacao unica');
