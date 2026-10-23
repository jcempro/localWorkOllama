// FT-CONTINUITY-U6C. Read-only observations; no application launch or inference.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const execU6C = promisify(execFile);
const ROOT_U6C = path.dirname(fileURLToPath(import.meta.url));
const WINDOWS_ROOT_U6C = process.env.SystemRoot ?? process.env.WINDIR;
export async function observeContinuityU6C() {
  if (process.platform !== 'win32') return {schema:1,bootId:null,desktopInstance:null,reason:'PLATFORM_OBSERVATION_UNAVAILABLE'};
  if(!WINDOWS_ROOT_U6C)throw Error('WINDOWS_ROOT_UNAVAILABLE');
  const exe = path.join(WINDOWS_ROOT_U6C,'System32','WindowsPowerShell','v1.0','powershell.exe');
  const {stdout} = await execU6C(exe,['-NoProfile','-NonInteractive','-File',path.join(ROOT_U6C,'continuity.ps1')],
    {windowsHide:true,timeout:15_000,maxBuffer:16_384});
  const value = JSON.parse(stdout.replace(/^\uFEFF/,''));
  if(value.schema!==1 || typeof value.bootId!=='string' || !value.bootId ||
      !(value.desktopInstance===null || typeof value.desktopInstance==='string')) throw Error('CONTINUITY_OBSERVATION_INVALID');
  return value;
}
export function latestContinuityTurnU6C(codexHome: string, threadId: string, repoPath: string) {
  const db = new DatabaseSync(path.join(codexHome,'state_5.sqlite'),{readOnly:true});
  try {
    const row:any=db.prepare('SELECT cwd,archived FROM threads WHERE id=?').get(threadId);
    const norm=(p:string)=>{const value=path.resolve(p.replace(/^\\\\\?\\/,''));return process.platform==='win32'?value.toLowerCase():value;};
    if(!row || row.archived || norm(row.cwd)!==norm(repoPath)) throw Error('CONTINUITY_TARGET_UNAVAILABLE');
  } finally {db.close();}
  const history = new DatabaseSync(path.join(codexHome,'thread_history_1.sqlite'),{readOnly:true});
  try {
    const row:any=history.prepare('SELECT turn_id,status,error_json,started_at FROM thread_turns WHERE thread_id=? ORDER BY started_at DESC,rollout_ordinal DESC LIMIT 1').get(threadId);
    return row?{id:row.turn_id,status:row.status,error:row.error_json?JSON.parse(row.error_json):null,startedAt:row.started_at}:null;
  } finally {history.close();}
}
export function sessionReasonU6C(lease:any, observation:any) {
  if(!lease || lease.schema!==1 || !lease.bootId || !lease.desktopInstance) return 'AUTHORIZATION_MISSING';
  if(!observation?.bootId) return 'SESSION_UNVERIFIABLE';
  if(lease.bootId!==observation.bootId) return 'OS_SESSION_CHANGED';
  if(!observation.desktopInstance) return 'DESKTOP_CLOSED_OR_UNAVAILABLE';
  if(lease.desktopInstance!==observation.desktopInstance) return 'DESKTOP_INSTANCE_CHANGED';
  return null;
}
// C9R: status terminal não informa intenção. Só a causa estruturada comprovada
// de quota preserva a autorização; texto livre e interrupted nunca a concedem.
export function quotaSuspensionC9R(turn:any) {
  return turn?.status==='failed' && turn.error?.codexErrorInfo==='usageLimitExceeded';
}
export function callbackReasonU6C(lease:any, observation:any, turn:any) {
  const reason=sessionReasonU6C(lease,observation);
  if(reason) return reason;
  if(!lease.originTurnId || !turn) return 'ORIGIN_TURN_UNVERIFIABLE';
  if(turn.id!==lease.originTurnId) return 'NEWER_TURN_SUPERSEDES_CALLBACK';
  if(turn.status==='interrupted' || turn.status==='failed' && !quotaSuspensionC9R(turn)) return 'ORIGIN_TURN_STOPPED';
  return null;
}
export async function captureContinuityU6C(request:any,codexHome:string) {
  try {
    const observation=await observeContinuityU6C();
    const turn=latestContinuityTurnU6C(codexHome,request.thread_id,request.repoPath);
    return {...observation,originTurnId:turn?.id??null,capturedAt:Date.now()};
  } catch {return {schema:1,bootId:null,desktopInstance:null,reason:'AUTHORIZATION_UNVERIFIABLE',capturedAt:Date.now()};}
}
