import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const source=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../src/install.ps1');
const powershell=path.join(process.env.SystemRoot??'','System32/WindowsPowerShell/v1.0/powershell.exe');
const root=await fs.mkdtemp(path.join(os.tmpdir(),'supervisor-rules-'));
try{
 const base=path.join(root,'AGENTS.md'),override=path.join(root,'AGENTS.override.md'),worker=path.join(root,'must-not-install-worker');
 const start='<!-- LOCALWORKER_GLOBAL_START -->',end='<!-- LOCALWORKER_GLOBAL_END -->';
 await fs.writeFile(base,`Prefixo preservado\n${start}\nNorma antiga\n${end}\nSufixo preservado\n`);
 const run=(extra:string[]=[])=>spawnSync(powershell,['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',source,'-GlobalRulesOnly','-CodexHome',root,'-WorkerHome',worker,'-NodeExe',path.join(root,'missing-node.exe'),...extra],{encoding:'utf8',windowsHide:true});
 const first=run();assert.equal(first.status,0,first.stderr);assert.equal(JSON.parse(first.stdout).status,'GLOBAL_RULES_INSTALLED');
 const text=await fs.readFile(base,'utf8');assert.ok(text.startsWith('Prefixo preservado\n'));assert.ok(text.endsWith('\nSufixo preservado\n'));
 assert.ok(text.includes('authorized_commands[].program'));assert.ok(!text.includes('Norma antiga'));
 const files=await fs.readdir(root);assert.equal(run().status,0);assert.deepEqual(await fs.readdir(root),files);assert.equal(await fs.readFile(base,'utf8'),text);
 await assert.rejects(fs.stat(worker),{code:'ENOENT'});
 await fs.writeFile(override,'Override pessoal preservado\n');assert.equal(run().status,0);assert.equal(await fs.readFile(base,'utf8'),text);
 assert.ok((await fs.readFile(override,'utf8')).startsWith('Override pessoal preservado'));
 const overrideText=await fs.readFile(override,'utf8');assert.notEqual(run(['-SkipGlobalRules']).status,0);assert.equal(await fs.readFile(override,'utf8'),overrideText);
 await fs.writeFile(override,start+'\nBloco parcial');assert.notEqual(run().status,0);assert.equal(await fs.readFile(override,'utf8'),start+'\nBloco parcial');
 console.log('PASS: PowerShell 5.1; regras isoladas, prefixo/sufixo, override, idempotencia, conflito e bloco parcial preservados; sem runtime');
}finally{
 const actual=await fs.realpath(root);assert.equal(path.dirname(actual).toLowerCase(),(await fs.realpath(os.tmpdir())).toLowerCase());
 await fs.rm(actual,{recursive:true,force:true});
}
