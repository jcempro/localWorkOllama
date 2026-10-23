// Extensão interna de manutenção: um evento de processo, sem timer/boot/polling pago.
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {observeContinuityU6C,latestContinuityTurnU6C,callbackReasonU6C} from '../localworker/continuity.mts';
import {resolveCodex} from '../supervisor/rpc.mts';
import {observeQueue,parseQueueReceipt} from '../supervisor/receipts.mts';
import {createHash} from 'node:crypto';
const execC9R=promisify(execFile);
const stateFileC9R=path.resolve(process.argv[2]??'');
const stateC9R=JSON.parse(await fs.readFile(stateFileC9R,'utf8'));
const lockC9R=await fs.open(stateFileC9R+'.lock','wx');
let phaseC9R='WAIT_INSTALLER';
const saveC9R=async(patch:any)=>{
  Object.assign(stateC9R,patch,{updatedAt:Date.now()});
  const temp=stateFileC9R+'.tmp';await fs.writeFile(temp,JSON.stringify(stateC9R,null,2)+'\n');await fs.rename(temp,stateFileC9R);
};
const reasonC9R=async()=>{
  const control=await fs.readFile(stateC9R.controlFile);
  if(createHash('sha256').update(control).digest('hex')!==stateC9R.controlHash)return 'AUTHORIZATION_CHANGED_WHILE_WAITING';
  return callbackReasonU6C(stateC9R.lease,await observeContinuityU6C(),
    latestContinuityTurnU6C(stateC9R.config.codexHome,stateC9R.config.threadId,stateC9R.config.repoPath));
};
try{
  if(stateC9R.status!=='ARMED')process.exitCode=0;
  else{
    if(!Number.isSafeInteger(stateC9R.installerPid)||!Number.isFinite(stateC9R.installerStartedMs))throw Error('INVALID_INSTALLER_IDENTITY');
    const ps=path.join(process.env.SystemRoot!,'System32/WindowsPowerShell/v1.0/powershell.exe');
    // Wait-Process conserva o handle do processo observado. Não consulta o Worker.
    const script=`$ErrorActionPreference='Stop';$p=Get-Process -Id ${stateC9R.installerPid} -ErrorAction SilentlyContinue;if($p){$at=[DateTimeOffset]::new($p.StartTime.ToUniversalTime()).ToUnixTimeMilliseconds();if([Math]::Abs($at-${stateC9R.installerStartedMs}) -gt 10){throw 'INSTALLER_PID_REUSED'};Wait-Process -InputObject $p};exit 0`;
    await execC9R(ps,['-NoProfile','-NonInteractive','-Command',script],{windowsHide:true,maxBuffer:4096});
    phaseC9R='AUTHORIZE';const reason=await reasonC9R();
    if(reason)await saveC9R({status:'PAUSED_USER',reason});
    else{
      phaseC9R='VERIFY_PROOF';let proof:any;
      try{proof=JSON.parse(await fs.readFile(stateC9R.proofFile,'utf8'));}catch{}
      const success=proof&&Date.parse(proof.timestamp_utc)>=stateC9R.armedAt&&
        proof.global_config_preserved===true&&proof.worker_config_preserved===true&&
        proof.installations?.every((x:any)=>x.control_preserved&&x.hashes_and_manifest_match&&!x.boot_logon&&!x.wake_or_catchup);
      // Continue é apenas handoff: o supervisor deve validar prova ou corrigir falha.
      await saveC9R({installation:success?'VERIFIED':'NEEDS_DIAGNOSIS'});
      const beforeSend=await reasonC9R();
      if(beforeSend)await saveC9R({status:'PAUSED_USER',reason:beforeSend});
      else{
        const codex=await resolveCodex(stateC9R.config);
        phaseC9R='SEND';await saveC9R({status:'SENDING',sendStartedAt:Date.now()});
        const observer=observeQueue(stateC9R.config);
        try{
          const receipt=await execC9R(codex,['queue','-C',stateC9R.config.repoPath,'--thread',stateC9R.config.threadId,'--message','continue'],
            {windowsHide:true,cwd:stateC9R.config.repoPath,env:{...process.env,CODEX_HOME:stateC9R.config.codexHome},maxBuffer:4096,timeout:30_000});
          const queueId=parseQueueReceipt(receipt.stdout,stateC9R.config.threadId);
          await saveC9R({status:'QUEUED_TO_CHAT',queueId,messageClientId:queueId?observer.messageClientId(queueId):null,
            acknowledgement:receipt.stdout.trim().slice(0,1000)});
        }finally{observer.close();}
      }
    }
  }
}catch(error:any){await saveC9R({status:stateC9R.sendStartedAt?'SEND_AMBIGUOUS':'BLOCKED',errorStage:phaseC9R,reason:String(error.code??error.message).slice(0,160)});process.exitCode=1;}
finally{await lockC9R.close();await fs.rm(stateFileC9R+'.lock',{force:true});}
