// Testa somente código próprio do construtor com fixtures; nenhum job/negócio histórico é executado.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {execFileSync,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const gitK2F=process.argv[2];assert(gitK2F&&path.isAbsolute(gitK2F));
const rootK2F=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const currentK2F=path.join(rootK2F,'constructor/audit-failure-checkpoint.mts');
const shaK2F=x=>createHash('sha256').update(x).digest('hex');
const baselineK2F=execFileSync(gitK2F,['show','4980dcf:constructor/audit-failure-checkpoint.mts'],{cwd:rootK2F,windowsHide:true});
assert.equal(shaK2F(baselineK2F),'8f1bf4fedbf22d3e3276c87839b03e9ad8f5b087f4e2ddfc0552f65a427e5eef');
const tempRootK2F=fs.realpathSync(os.tmpdir()),dirK2F=fs.mkdtempSync(path.join(tempRootK2F,'k2f-format-'));
const idK2F='00000000-0000-4000-8000-000000000001';
const saveK2F=(name,value)=>{const file=path.join(dirK2F,name),bytes=Buffer.from(typeof value==='string'?value:JSON.stringify(value));fs.writeFileSync(file,bytes);return [file,shaK2F(bytes)];};
const runK2F=(source,args)=>execFileSync(process.execPath,['--experimental-strip-types',source,...args],{windowsHide:true,encoding:'utf8',timeout:10000});
try{
 const oldK2F=path.join(dirK2F,'known-constructor-baseline.mts');fs.writeFileSync(oldK2F,baselineK2F);
 const fixture={jobs:[{id:idK2F,state:{status:'FAILED',error_kind:'WORKER_INCOMPLETE',step:2,completed_tools:1,failed_tools:1,context_compactions:0},
  request:{task:'Synthetic fixture only',mode:'write',required_command_ids:['test_one']},
  events:[{line:1,phase:'tool_result',tool:'run_authorized_command',outcome:'error',diagnostic:'comando test_one: falha 2; stdout=0 caracteres; stderr=0 caracteres'},
   {line:2,phase:'completion_blocked',reason:'CONTRACT_UNFULFILLED: leituras pendentes=[]; comandos pendentes=["test_one"]'}],
  error:'Synthetic fixture error\nESTADO GIT DETERMINÍSTICO (synthetic; no actual repository state):\n## fixture\n'}]};
 const capture=saveK2F('capture.json',fixture),legacy=runK2F(oldK2F,[...capture,idK2F]),fresh=runK2F(currentK2F,[...capture,idK2F]);
 assert.equal(fresh,legacy,'default output must remain byte-identical on fixture');
 const compact=runK2F(currentK2F,['--compact',...capture,idK2F]);assert.equal(compact.trim().split(/\s+/u).length,2);
 const full=JSON.parse(fresh.slice('K2F_FAILURE_CHECKPOINT '.length)),report=JSON.parse(compact.slice('K2F_COMPACT_CHECKPOINT '.length));
 assert.equal(report.records[0].row_sha256,shaK2F(JSON.stringify(full.results[0])));
 assert.deepEqual(report.records[0].command_attempts,[{line:1,id:'test_one',exit_code:2,outcome:'error'}]);
 assert.deepEqual(report.records[0].completion_blocked,[{line:2,ids:['test_one'],reason_status:'recognized'}]);
 const candidate='RESULTADO DETERMINÍSTICO\nComando checkpoint_failures; exit_code=0\nstdout:\n'+fresh;
 const saved={job_id:'00000000-0000-4000-8000-000000000002',rejections:[{candidate,candidate_chars:candidate.length,candidate_sha256:shaK2F(candidate),truncated:false}]};
 const artifact=saveK2F('retained.json',saved),retained=runK2F(currentK2F,['--retained',...artifact,shaK2F(candidate)]);
 assert.equal(retained.trim().split(/\s+/u).length,2);const reused=JSON.parse(retained.slice('K2F_COMPACT_CHECKPOINT '.length));
 assert.deepEqual(reused.records,report.records);assert.equal(reused.retained_origin.extraction_repeated,false);
 const longReason=structuredClone(fixture);longReason.jobs[0].events[1].reason='comandos pendentes='+JSON.stringify(['x'.repeat(600)]);
 const longOutput=runK2F(currentK2F,['--compact',...saveK2F('long-reason.json',longReason),idK2F]);
 const longReport=JSON.parse(longOutput.slice('K2F_COMPACT_CHECKPOINT '.length));
 assert.equal(longReport.records[0].completion_blocked[0].ids,null);assert.equal(longReport.records[0].completion_blocked[0].reason_status,'truncated');
 let negativeCases=0;
 const reject=(args)=>{const r=spawnSync(process.execPath,['--experimental-strip-types',currentK2F,...args],{windowsHide:true,encoding:'utf8',timeout:10000});assert.notEqual(r.status,0);assert.equal(r.stdout,'');negativeCases++;};
 reject(['--retained',...artifact,'0'.repeat(64)]);
 const truncated=structuredClone(saved);truncated.rejections[0].truncated=true;reject(['--retained',...saveK2F('truncated.json',truncated),shaK2F(candidate)]);
 const cancelled=structuredClone(fixture);cancelled.jobs[0].state.status='CANCELLED';reject(['--compact',...saveK2F('cancelled.json',cancelled),idK2F]);
 reject(['--compact',...capture,idK2F,idK2F]);
 console.log('K2F_REPORT_TEST_OK legacy_byte_identity=true compact_words=2 retained_words=2 no_reextraction=true truncated_reason_explicit=true negative_cases='+negativeCases+' historical_business_executed=false');
}finally{
 const real=fs.realpathSync(dirK2F);assert(real.startsWith(tempRootK2F+path.sep+'k2f-format-'));assert.equal(real,path.resolve(dirK2F));assert(!fs.lstatSync(dirK2F).isSymbolicLink());
 fs.rmSync(dirK2F,{recursive:true});
}
