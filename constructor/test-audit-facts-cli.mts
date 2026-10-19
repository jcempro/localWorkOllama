import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync,spawnSync} from 'node:child_process';

const DIR_A3F=path.dirname(fileURLToPath(import.meta.url));
const ROOT_A3F=path.dirname(DIR_A3F);
const SCRIPT_A3F=path.join(DIR_A3F,'render-audit.mjs');
const PRIVATE_A3F=path.join(DIR_A3F,'audit-private');
const LEGACY_HASH_A3F='4f6679ebc8e2e137e5d65ac7bb0aee6a7bcc0d9b05e0114f05468c516ba2bc3b';
const hashA3F=value=>createHash('sha256').update(value).digest('hex');
const protectedA3F=['audit-report.md','audit-manifest.json'].map(name=>{
  const file=path.join(DIR_A3F,name);
  return [file,fs.existsSync(file)?hashA3F(fs.readFileSync(file)):null];
});
if(fs.realpathSync(PRIVATE_A3F)!==PRIVATE_A3F)throw Error('Diretório de fixture redirecionado');
const fixtureA3F=fs.mkdtempSync(path.join(PRIVATE_A3F,'facts-cli-'));
const runA3F=(args)=>execFileSync(process.execPath,['--experimental-strip-types',SCRIPT_A3F,...args],{cwd:ROOT_A3F,windowsHide:true,timeout:30000,maxBuffer:4*1024*1024,encoding:'utf8',stdio:['ignore','pipe','pipe']});
const failA3F=(args,pattern)=>{
  const result=spawnSync(process.execPath,['--experimental-strip-types',SCRIPT_A3F,...args],{cwd:ROOT_A3F,windowsHide:true,timeout:30000,encoding:'utf8',stdio:['ignore','pipe','pipe']});
  assert.equal(result.error,undefined);
  assert.notEqual(result.status,0);
  assert.match(result.stderr,pattern);
};
try{
  const old={id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',state:{status:'COMPLETED'},events:[]};
  const secret='PRIVATE_A3F_CLI_SENTINEL';
  const fresh={id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',state:{status:'FAILED',step:0,error_kind:secret},events:[{line:1,phase:'tool_result',tool:'read_file',outcome:'ok',payload:secret}],task:secret,result:secret,request:{required_read_paths:[secret]}};
  const current=path.join(fixtureA3F,'current.json'),baseline=path.join(fixtureA3F,'baseline.json');
  fs.writeFileSync(current,JSON.stringify({jobs:[fresh,old],paths:secret}),{flag:'wx'});
  fs.writeFileSync(baseline,JSON.stringify({jobs:[old]}),{flag:'wx'});
  const text=runA3F(['--facts',current,baseline]),out=JSON.parse(text);
  assert.deepEqual(out.counts,{current:2,baseline:1,new:1});
  assert.equal(out.rows[0].id,fresh.id);
  assert.deepEqual(out.rows[0].success_lines,[1]);
  assert.equal(out.rows[0].error_kind,'OTHER');
  assert.equal(out.rows[0].semantic_acceptance,'NOT_ASSESSED');
  assert.equal(text.includes(secret),false);
  assert.equal(runA3F(['--facts',current,baseline]),text);
  failA3F(['--facts'],/Uso:.*--facts/);
  failA3F(['--facts',current,baseline,'extra'],/Uso:.*--facts/);
  const invalid=path.join(fixtureA3F,'invalid.json');
  fs.writeFileSync(invalid,'{',{flag:'wx'});
  failA3F(['--facts',invalid,baseline],/MALFORMED_JSON/);
  fs.writeFileSync(invalid,JSON.stringify({jobs:[old,{...old,id:old.id.toUpperCase()}]}));
  failA3F(['--facts',invalid,baseline],/MALFORMED_AUDIT_INPUT/);
  const currentReal=path.join(PRIVATE_A3F,'2026-10-15-current/inventory.json');
  const baselineReal=path.join(PRIVATE_A3F,'2026-10-12-final/inventory.json');
  const real=JSON.parse(runA3F(['--facts',currentReal,baselineReal]));
  assert.deepEqual(real.counts,{current:264,baseline:197,new:67});
  assert.equal(real.rows.length,67);
  assert.deepEqual(real.hashes,{current:hashA3F(fs.readFileSync(currentReal)),baseline:hashA3F(fs.readFileSync(baselineReal))});
  assert.ok(real.rows.every(row=>row.semantic_acceptance==='NOT_ASSESSED'));
  const renderer=fs.readFileSync(SCRIPT_A3F,'utf8');
  const marker=/\/\/ A3F_FACTS_MODE_START\n[\s\S]*?\/\/ A3F_FACTS_MODE_END\n/;
  assert.equal((renderer.match(/A3F_FACTS_MODE_START/g)||[]).length,1);
  assert.equal(hashA3F(renderer.replace(marker,'')),LEGACY_HASH_A3F,'Modo padrão alterado fora da inserção');
  for(const [file,before] of protectedA3F)assert.equal(fs.existsSync(file)?hashA3F(fs.readFileSync(file)):null,before,'Relatório/manifesto alterado');
  console.log('A3F_CLI_FACTS_OK; real=264/197/67; privacidade/argumentos/erros/determinismo; legado e relatorios preservados');
}finally{
  if(path.dirname(fixtureA3F)!==PRIVATE_A3F||fs.realpathSync(fixtureA3F)!==fixtureA3F)throw Error('Limpeza fora da fronteira recusada');
  fs.rmSync(fixtureA3F,{recursive:true,force:true});
}
