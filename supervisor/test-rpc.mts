import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { resolveCodex } from './rpc.mts';
const root=await fs.mkdtemp(path.join(os.tmpdir(),'supervisor-cli-'));
const present=path.join(root,'codex.exe'),missing=path.join(root,'removed-version.exe');
try{
  await fs.writeFile(present,'fixture: never executed');
  let calls=0;
  const resolver=async()=>{calls++;return {codexCommand:async()=>present};};
  assert.equal(await resolveCodex({codex:present,workerHome:root},resolver),present);
  assert.equal(calls,0);
  assert.equal(await resolveCodex({codex:missing,workerHome:root},resolver),present);
  assert.equal(calls,1);
  calls=0;
  assert.equal(await resolveCodex({codex:missing,workerHome:root},async()=>{
    if(++calls===1)throw Object.assign(Error('worker absent'),{code:'ENOENT'});
    return {codexCommand:async()=>present};
  }),present);
  assert.equal(calls,2);
  await assert.rejects(resolveCodex({codex:missing,workerHome:root},async()=>({codexCommand:async()=>missing})),/CODEX_CLI_UNAVAILABLE/);
  await assert.rejects(resolveCodex({codex:missing,workerHome:root},async()=>({codexCommand:async()=>'.\\codex.exe'})),/CODEX_CLI_UNAVAILABLE/);
  console.log('PASS: CLI preservado, atualizado, Worker ausente, fallback finito e path relativo recusado');
}finally{await fs.unlink(present);await fs.rmdir(root);}
