import { createHash } from 'node:crypto';

export const POLICY_S8R = Object.freeze({ threshold: 90, delayMs: 60_000, retryMs: 30_000, maxRetryMs: 900_000 });
export const digest = (value         ) => createHash('sha256').update(JSON.stringify(value)).digest('hex');

// SSOT da seleção: null/ausência não significa saldo zero.
export function windows(snapshot     ) {
  const buckets = snapshot.rateLimitsByLimitId ?? (snapshot.rateLimits ? { [snapshot.rateLimits.limitId ?? 'codex']: snapshot.rateLimits } : {});
  const out        = [];
  for (const [bucketId, bucket] of Object.entries(buckets)       ) {
    for (const name of ['primary', 'secondary']) {
      const w = bucket?.[name];
      if (!w || !Number.isFinite(w.usedPercent) || w.usedPercent < 0 || w.usedPercent > 100) continue;
      out.push({ bucketId, name, usedPercent: w.usedPercent, resetsAt: w.resetsAt, windowDurationMins:w.windowDurationMins??null });
    }
  }
  return out;
}

// Um episodio de escassez tem identidade persistente; resetsAt pode ser refinado
// pelo servidor e nao pode, por si so, produzir outra mensagem.
export function planCycles(snapshot     , target     , ledger     , existing       , now        ) {
  const result       =[];
  ledger.schema=1;ledger.windows??={};
  for(const w of windows(snapshot)) {
    const key=digest([target.accountKey,target.threadId,target.repoPath,w.bucketId,w.name]);
    let episode=ledger.windows[key];
    if(w.usedPercent<POLICY_S8R.threshold){if(episode)episode.recoveryObserved=true;continue;}
    if(!Number.isFinite(w.resetsAt)||w.resetsAt<=0)throw new Error('RESET_TIME_UNAVAILABLE');
    if(w.resetsAt*1000+POLICY_S8R.delayMs<now-POLICY_S8R.delayMs)throw new Error('STALE_RESET_TELEMETRY');
    // Migracao conservadora dos ciclos antigos, sem repetir enviados.
    if(!episode){
      const prior=existing.filter(e=>!e.window.test&&e.window.bucketId===w.bucketId&&e.window.name===w.name&&e.target.accountKey===target.accountKey&&e.target.threadId===target.threadId).sort((a,b)=>b.detectedAt-a.detectedAt)[0];
      if(prior)episode=ledger.windows[key]={eventId:prior.id,resetAt:prior.window.resetsAt,recoveryObserved:false};
    }
    const priorExpired=episode && now>episode.resetAt*1000+POLICY_S8R.delayMs && w.resetsAt*1000>now;
    const newWindowObserved=episode?.recoveryObserved && Number.isFinite(w.windowDurationMins) &&
      w.resetsAt>episode.resetAt+w.windowDurationMins*30;
    if(!episode||priorExpired||newWindowObserved){
      const event=detect({rateLimits:{limitId:w.bucketId,[w.name]:w}},target,now)[0];
      // detect conserva a chave da janela para ciclos simultaneos equivalentes.
      episode=ledger.windows[key]={eventId:event.id,resetAt:w.resetsAt,recoveryObserved:false};
      result.push(event);
    }else{
      const prior=existing.find(e=>e.id===episode.eventId);
      if(prior&&!prior.sendStartedAt&&prior.status!=='COMPLETED')result.push({...prior,window:w,dueAt:w.resetsAt*1000+POLICY_S8R.delayMs});
      if(!prior)result.push({...detect({rateLimits:{limitId:w.bucketId,[w.name]:w}},target,now)[0],id:episode.eventId});
      episode.resetAt=w.resetsAt;
    }
  }
  return result;
}

export function detect(snapshot     , target     , now        ) {
  return windows(snapshot).filter(w => w.usedPercent >= POLICY_S8R.threshold).map(w => {
    if (!Number.isFinite(w.resetsAt) || w.resetsAt <= 0) throw new Error('RESET_TIME_UNAVAILABLE');
    const dueAt = w.resetsAt * 1000 + POLICY_S8R.delayMs;
    if (dueAt < now - POLICY_S8R.delayMs) throw new Error('STALE_RESET_TELEMETRY');
    // Janelas do mesmo bucket restauradas no mesmo instante formam um unico ciclo.
    const id = digest([target.accountKey, target.threadId, target.repoPath, w.bucketId, w.resetsAt]);
    return { schema: 1, id, target, window: w, dueAt, detectedAt: now, status: 'SCHEDULED', attempts: 0 };
  });
}

const userText = (item     ) => (item.content ?? []).map((c     ) => c.type === 'text' ? c.text : '').join('');
export function responseEvidence(event     , turns       ) {
  const candidates = turns.filter(t => !event.baselineTurns.includes(t.id) && t.startedAt * 1000 >= event.sendStartedAt - 1000 &&
    t.items?.some((i     ) => i.type === 'userMessage' && userText(i) === 'continue' &&
      (!event.messageClientId || i.clientId===event.messageClientId)));
  if (candidates.length > 1) return { status: 'AMBIGUOUS_RESPONSE', reason: 'MULTIPLE_CONTINUE_TURNS' };
  const turn = candidates[0];
  if (!turn) return { status: 'AWAITING_RESPONSE' };
  if (turn.error || ['failed', 'interrupted'].includes(turn.status)) return { status: 'RESPONSE_ERROR', turnId: turn.id };
  const final = turn.items.find((i     ) => i.type === 'agentMessage' && i.phase === 'final' && i.text?.trim() && i.text.trim() !== 'continue');
  if (turn.status !== 'completed' || !final) return { status: 'RECEIVED', turnId: turn.id };
  const matchingReceipt = turn.items.some((i     ) => i.type === 'userMessage' &&
    ((event.messageId && i.id === event.messageId) || (event.messageClientId && i.clientId === event.messageClientId)));
  return { status: matchingReceipt ? 'COMPLETED' : 'RESPONSE_OBSERVED_UNCORRELATED', turnId: turn.id, responseId: final.id, responseHash: digest(final.text), reason: matchingReceipt ? null : 'TRANSPORT_HAS_NO_VERIFIABLE_MESSAGE_RECEIPT' };
}

// Todas as mutações passam por save antes de efeitos não idempotentes.
export async function advance(event     , io     , now        ) {
  if (event.status === 'COMPLETED') return event;
  const save = async (patch     ) => { Object.assign(event, patch, { updatedAt: now }); await io.save(event); };
  // Recuperar recibo enquanto a fila ainda retém a mensagem, mesmo durante backoff.
  if(event.sendStartedAt&&!event.messageClientId&&io.reconcileReceipt){
    const receipt=await io.reconcileReceipt(event);
    if(receipt?.messageClientId)await save(receipt);
  }
  if (now < Math.max(event.dueAt, event.nextAttemptAt ?? 0)) return event;
  let stage='preflight';
  try {
    await io.identity(event.target);
    if (event.sendStartedAt) {
      stage='confirmation';
      await io.recoverDesktop();
      const evidence = responseEvidence(event, await io.turns(event.target, event));
      await save({ ...evidence, nextAttemptAt: now + (evidence.status === 'RECEIVED' ? 60_000 : POLICY_S8R.maxRetryMs) });
      return event; // Nunca repetir envio sem recibo idempotente.
    }
    const quota = await io.quota();
    if (!windows(quota).length) throw new Error('QUOTA_UNAVAILABLE');
    const blocked = windows(quota).filter(w => w.usedPercent >= 100);
    if (blocked.length) {
      if (blocked.some(w => !Number.isFinite(w.resetsAt))) throw new Error('RESET_TIME_UNAVAILABLE');
      await save({ status: 'WAITING_QUOTA', nextAttemptAt: Math.max(now + POLICY_S8R.retryMs, ...blocked.map(w => w.resetsAt * 1000 + POLICY_S8R.delayMs)), diagnostic: 'QUOTA_NOT_RESTORED' });
      return event;
    }
    const original = windows(quota).find(w => w.bucketId === event.window.bucketId && w.name === event.window.name);
    if (!event.window.test && (!original || (original.resetsAt === event.window.resetsAt && original.usedPercent >= POLICY_S8R.threshold))) {
      await save({status:'WAITING_QUOTA',nextAttemptAt:now+POLICY_S8R.retryMs,diagnostic:'RESET_NOT_YET_OBSERVED'});
      return event;
    }
    await io.ready(event.target);
    const baselineTurns = (await io.turns(event.target)).map((t     ) => t.id);
    stage='send';
    await save({ status: 'SENDING', baselineTurns, dispatchObservedAt: now, sendStartedAt: io.now(),
      attempts: event.attempts + 1,sendAttempts:(event.sendAttempts??0)+1 });
    const receipt = await io.send(event.target, 'continue');
    await save({ status: 'SENT', sentAt: io.now(), messageId: receipt.messageId ?? null, messageClientId:receipt.messageClientId??null,
      queueId:receipt.queueId??null, acknowledgement: receipt.acknowledgement ?? null, nextAttemptAt: now + 60_000 });
  } catch (error     ) {
    // Só ENOENT de spawn prova ausência de envio; erros de rede/exit são ambíguos.
    const noSend = error.code === 'SEND_NOT_STARTED';
    if (noSend) delete event.sendStartedAt;
    const attempts = event.attempts + 1;
    await save({ status: stage==='confirmation'?'CONFIRMATION_RETRY':event.sendStartedAt ? 'SEND_AMBIGUOUS' : 'RETRY', attempts,
      recoveryAttempts:(event.recoveryAttempts??0)+1,errorStage:stage,
      diagnostic: String(error.message).slice(0, 500), nextAttemptAt: now + Math.min(POLICY_S8R.maxRetryMs, POLICY_S8R.retryMs * 2 ** Math.min(attempts, 5)) });
  }
  return event;
}
