import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import path from 'node:path';

// Testa somente o preambulo real; nunca executa efeitos dos instaladores.
const filesU4M=['constructor/install-causal-resume.ps1','supervisor/install.ps1'];
const hostsU4M=process.argv.slice(2);
assert(hostsU4M.length>0);
const resultsU4M=[];
for(const fileU4M of filesU4M){
  const textU4M=readFileSync(fileU4M,'utf8');
  const importU4M=textU4M.split(/\r?\n/).filter(line=>line.startsWith('Import-Module ([IO.Path]::Combine($PSHOME,') || line.startsWith('$null=Get-Command Microsoft.PowerShell.Utility\\Get-FileHash'));
  assert.equal(importU4M.length,2);
  const expectedU4M=createHash('sha256').update(readFileSync(fileU4M)).digest('hex');
  for(const hostU4M of hostsU4M){
    assert(path.isAbsolute(hostU4M));
    for(const autoloadU4M of ['All','None']){
      const scriptU4M=["$ErrorActionPreference='Stop'","Import-Module ([IO.Path]::Combine($PSHOME,'Modules/Microsoft.PowerShell.Management/Microsoft.PowerShell.Management.psd1')) -ErrorAction Stop",`$PSModuleAutoLoadingPreference='${autoloadU4M}'`,...importU4M,
        "$hashU4M=(Microsoft.PowerShell.Utility\\Get-FileHash -LiteralPath $env:UTILITY_TEST_FILE_U4M -Algorithm SHA256).Hash.ToLowerInvariant()",
        "Write-Output ($PSVersionTable.PSVersion.Major.ToString()+'|'+$hashU4M)"].join('\n');
      let resultU4M;
      try { resultU4M=execFileSync(hostU4M,['-NoProfile','-NonInteractive','-Command',scriptU4M],{
        env:{...process.env,UTILITY_TEST_FILE_U4M:path.resolve(fileU4M)},windowsHide:true,encoding:'utf8',timeout:20000,stdio:['ignore','pipe','pipe']}).trim(); }
      catch(errorU4M:any){throw new Error(String(errorU4M.stderr||'UTILITY_HOST_FAILED').slice(0,1200));}
      const [majorU4M,hashU4M]=resultU4M.split('|');
      assert.equal(hashU4M,expectedU4M);
      resultsU4M.push({file:fileU4M,major:Number(majorU4M),autoload:autoloadU4M,hash_match:true});
    }
  }
}
console.log(JSON.stringify({status:'NATIVE_UTILITY_U4M_OK',cases:resultsU4M,installation_effects:0,global_environment_changes:0}));
