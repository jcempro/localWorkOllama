# Teste interno, isolado: invocar com Windows PowerShell 5.1 ou PowerShell 7.
param([string]$NodeExe, [string]$CodexExe)
$ErrorActionPreference='Stop'
if(-not $NodeExe){$NodeExe=(Get-Command node.exe -ErrorAction Stop).Source}
if(-not $CodexExe){throw 'Informe o executavel Codex realmente descoberto.'}
$rootP5N=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$privateP5N=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot 'audit-private'))
$fixtureP5N=Join-Path $privateP5N ('ps-node transport-'+[guid]::NewGuid().ToString('D'))
$jobP5N=[guid]::NewGuid().ToString('D')
$jobPathP5N=Join-Path (Join-Path $fixtureP5N 'jobs') $jobP5N
New-Item -ItemType Directory -Path $jobPathP5N -Force | Out-Null
$stateP5N=Join-Path $jobPathP5N 'state.json'
$activeP5N=Join-Path $fixtureP5N 'active.json'
$scriptP5N=Join-Path $rootP5N 'localworker/update-installed.ps1'
try{
  foreach($statusP5N in @('RUNNING','COMPLETED')){
    [IO.File]::WriteAllText($stateP5N,(@{job_id=$jobP5N;status=$statusP5N}|ConvertTo-Json),[Text.UTF8Encoding]::new($false))
    [IO.File]::WriteAllText($activeP5N,(@{job_id=$jobP5N}|ConvertTo-Json),[Text.UTF8Encoding]::new($false))
    $beforeP5N=(Get-FileHash -LiteralPath $stateP5N).Hash
    $diagnosticP5N=''
    try{& $scriptP5N -Target $fixtureP5N -NodePath $NodeExe -CodexCommand $CodexExe;throw 'Atualizacao nao deveria concluir com fixture incompleta.'}
    catch{$diagnosticP5N=$_.Exception.Message}
    $expectedP5N=if($statusP5N -eq 'RUNNING'){'Job ativo: instalação adiada.'}else{'config.json instalado ausente.'}
    if($diagnosticP5N -ne $expectedP5N){throw "Diagnostico incorreto: $diagnosticP5N"}
    if((Get-FileHash -LiteralPath $stateP5N).Hash -ne $beforeP5N){throw 'Estado do job alterado.'}
    if(Test-Path -LiteralPath (Join-Path $fixtureP5N 'worker-core.mjs')){throw 'Runtime copiado sem precondicoes.'}
    if(-not(Test-Path -LiteralPath $activeP5N)){throw 'Indice valido removido.'}
  }
  # Descoberta e probe usam o mesmo transporte, sem cliente real/autenticacao.
  $supervisorP5N=Get-Content -LiteralPath (Join-Path $rootP5N 'supervisor/install.ps1') -Raw
  if($supervisorP5N -match '--input-type=module -e'){throw 'Transporte legado remanescente no instalador SR-001.'}
  $quotedP5N='console.log(JSON.stringify({quote:"preserved",empty:""}));' | & $NodeExe --input-type=module -
  if($LASTEXITCODE -ne 0 -or $quotedP5N -ne '{"quote":"preserved","empty":""}'){throw 'Aspas nao preservadas por stdin.'}
  Write-Output ('P5N_OK PowerShell '+$PSVersionTable.PSVersion.ToString()+'; RUNNING recusado, terminal reconhecido, estados intactos, aspas preservadas')
}finally{
  $resolvedP5N=[IO.Path]::GetFullPath($fixtureP5N)
  if([IO.Path]::GetDirectoryName($resolvedP5N) -ne $privateP5N){throw 'Limpeza fora do namespace privado recusada.'}
  $itemP5N=Get-Item -LiteralPath $resolvedP5N -Force -ErrorAction SilentlyContinue
  if($itemP5N -and $itemP5N.PSIsContainer -and -not($itemP5N.Attributes -band [IO.FileAttributes]::ReparsePoint)){Remove-Item -LiteralPath $resolvedP5N -Recurse -Force}
}
