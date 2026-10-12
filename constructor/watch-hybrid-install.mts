// Apoio temporário do Construtor: evento de instalação → uma retomada deste chat.
// Origem https://github.com/jcempro/localWorkOllama; ISC. Não integra runtime/distribuição.
import fs from 'node:fs/promises';
import {watch} from 'node:fs';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {pathToFileURL} from 'node:url';
import {resolveCodex} from '../supervisor/rpc.mts';
const stateFile=process.argv[2];
const state=JSON.parse(await fs.readFile(stateFile,'utf8'));
if(!/^[a-f0-9-]{36}$/i.test(state.thread_id)||!path.isAbsolute(state.log)||!path.isAbsolute(state.repoPath))throw Error('Identidade/paths inválidos');
const save=async(value:any)=>{const temp=stateFile+'.'+process.pid+'.tmp';const file=await fs.open(temp,'w');try{await file.writeFile(JSON.stringify(value,null,2));await file.sync();}finally{await file.close();}await fs.rename(temp,stateFile);};
if(['QUEUED_TO_CHAT','AMBIGUOUS','INTENT'].includes(state.status))process.exit(0); // Nunca reenviar estado incerto.
await save({...state,status:'WAITING_INSTALL_EVENT',watcher_pid:process.pid});
let busy=false,finished=false;
const probe=async()=>{
  if(busy||finished)return;busy=true;
  try{
    const log=await fs.readFile(state.log,'utf8').catch(e=>{if(e.code==='ENOENT')return '';throw e;});
    if(!/"status"\s*:\s*"INSTALLED"/.test(log))return;
    const config=JSON.parse(await fs.readFile(path.join(state.workerHome,'config.json'),'utf8'));
    if(config.maintenance_hybrid_version!==1)throw Error('Instalação terminou sem adoção esperada');
    process.env.CODEX_HOME=state.codexHome;process.env.LOCAL_CODEX_HOME=state.codexHome;
    const {assertTargetThread}=await import(pathToFileURL(path.join(state.workerHome,'thread-check.mjs')).href);
    assertTargetThread(state.thread_id,state.repoPath);
    const codex=await resolveCodex({workerHome:state.workerHome,codexHome:state.codexHome});
    // Persistência antecede o envio. Fila não é resposta confirmada nem conclusão da migração.
    await save({...state,status:'INTENT',at:new Date().toISOString(),watcher_pid:process.pid});
    try{
      const result=await promisify(execFile)(codex,['queue','-C',state.repoPath,'--thread',state.thread_id,'--message','continue'],{windowsHide:true,timeout:60000,maxBuffer:65536,env:{...process.env,CODEX_HOME:state.codexHome}});
      await save({...state,status:'QUEUED_TO_CHAT',acknowledgement:result.stdout.trim(),at:new Date().toISOString()});
    }catch(error:any){await save({...state,status:'AMBIGUOUS',reason:'Envio não confirmado; reconciliar, nunca reenviar cegamente.',code:error.code??null,at:new Date().toISOString()});}
    finished=true;observer.close();
  }catch(error:any){await save({...state,status:'INSTALL_VERIFICATION_BLOCKED',error:error.message,watcher_pid:process.pid,at:new Date().toISOString()});}
  finally{busy=false;}
};
// Evento gratuito, sem timer/polling ou inferência. Estado fica recuperável após perda do processo.
const observer=watch(path.dirname(state.log),(_event,name)=>{if(String(name)===path.basename(state.log))void probe();});
await probe();
