// T3P: fonte/artefato e texto puro. Não envia mensagem nem executa callbacks.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {stripTypeScriptTypes} from 'node:module';
import {randomUUID} from 'node:crypto';
import {queueMessage} from '../localworker/delivery.mjs';

const BEFORE_T3P='COMPLETED significa que a inferência terminou; confira';
const AFTER_T3P='COMPLETED registra o término técnico da execução; command_sequence não usa inferência. Confira';
const [baselineRef,gitExe,...extra]=process.argv.slice(2);
if(!/^[a-f0-9]{7,40}$/.test(baselineRef??'')||!gitExe||!path.isAbsolute(gitExe)||extra.length)throw Error('Uso: <baseline-commit> <git-exe-absoluto>');
const root=await fs.realpath(path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'));
const gitDir=await fs.realpath(path.join(root,'.git'));
assert.equal(gitDir.toLowerCase(),path.join(root,'.git').toLowerCase());
const env={...process.env,GIT_DIR:gitDir,GIT_WORK_TREE:root};
for(const key of ['GIT_COMMON_DIR','GIT_INDEX_FILE','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES'])delete env[key];
const baseline=execFileSync(gitExe,['--git-dir='+gitDir,'--work-tree='+root,'show',baselineRef+':localworker/delivery.mjs'],
  {cwd:root,env,windowsHide:true,encoding:'utf8',timeout:10000,maxBuffer:65536});
const source=await fs.readFile(path.join(root,'localworker/delivery.mts'),'utf8');
const artifact=await fs.readFile(path.join(root,'localworker/delivery.mjs'),'utf8');
const normalize=s=>s.replace(/\r\n/g,'\n').replace(/[ \t]+$/gm,'');
assert.equal(artifact.split(AFTER_T3P).length,2);
assert.equal(normalize(artifact.replace(AFTER_T3P,BEFORE_T3P)),normalize(baseline),'Única diferença de código permitida: frase do callback');
assert.equal(normalize(artifact),normalize(stripTypeScriptTypes(source,{mode:'strip'})),'Artefato corresponde à fonte canônica');
for(const status of ['COMPLETED','FAILED']){
  const id=randomUUID(),message=queueMessage(id,{status});
  assert.ok(message.startsWith('Retome a tarefa original neste mesmo chat. O localWorker do job '+id));
  assert.ok(message.includes(status==='COMPLETED'?'concluiu.':'terminou com FAILED.'));
  assert.ok(message.includes(AFTER_T3P));
  assert.ok(!message.includes(BEFORE_T3P));
  for(const text of ['Consulte local_result uma única vez','local_review','ESTADO GIT DETERMINÍSTICO','WORKER_INFRA_ERROR','SW-HYBRID','Não reinicie este job'])assert.ok(message.includes(text),text);
}
console.log(JSON.stringify({status:'T3P_CALLBACK_MESSAGE_OK',baseline_ref:baselineRef,
  only_declared_phrase_changed:true,source_artifact_equivalent:true,statuses:['COMPLETED','FAILED'],dispatches:0}));
