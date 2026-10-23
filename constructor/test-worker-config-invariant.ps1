$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'worker-config-invariant.ps1')
$exeC9R=(Get-Command node.exe -ErrorAction Stop).Source
$beforeC9R=@{codex_command='X:ictitious-removed-versioncodex.exe';model='fixture';context_tokens=32768;timeout_ms=0;reserve=@{cpu=2;ram=4};optional=$null;flags=@($true,$false)}
$afterC9R=$beforeC9R.Clone();$afterC9R.codex_command=$exeC9R
$baseTextC9R=$beforeC9R|ConvertTo-Json -Depth 20
$afterTextC9R=$afterC9R|ConvertTo-Json -Depth 20
$okC9R=Assert-WorkerConfigC9R -Before $baseTextC9R -After $afterTextC9R -ResolvedCodex $exeC9R
if(-not $okC9R.settings_preserved -or -not $okC9R.codex_command_refreshed){throw 'VALID_REFRESH_REJECTED'}
$sameC9R=Assert-WorkerConfigC9R -Before $afterTextC9R -After ($afterC9R|ConvertTo-Json -Depth 20 -Compress) -ResolvedCodex $exeC9R
if($sameC9R.codex_command_refreshed){throw 'FORMATTING_IS_NOT_CONFIG_CHANGE'}
$casesC9R=@(
  @{key='model';value='different'},@{key='context_tokens';value=16384},@{key='timeout_ms';value=999},
  @{key='reserve';value=@{cpu=1;ram=4}},@{key='optional';value='unexpected'},@{key='flags';value=@($false,$true)},
  @{key='codex_command';value='X:ictitious-wrong-executable.exe'},@{key='future_setting';value=1}
)
$rejectedC9R=0
foreach($caseC9R in $casesC9R){
  $changedC9R=$afterC9R.Clone();$changedC9R[$caseC9R.key]=$caseC9R.value
  try{$null=Assert-WorkerConfigC9R -Before $baseTextC9R -After ($changedC9R|ConvertTo-Json -Depth 20) -ResolvedCodex $exeC9R}
  catch{$rejectedC9R++;continue}
  throw ('CONFIG_CHANGE_WAS_ACCEPTED:'+ $caseC9R.key)
}
$removedC9R=$afterC9R.Clone();$removedC9R.Remove('optional')
try{$null=Assert-WorkerConfigC9R -Before $baseTextC9R -After ($removedC9R|ConvertTo-Json -Depth 20) -ResolvedCodex $exeC9R}
catch{$rejectedC9R++}
if($rejectedC9R -ne 9){throw 'CONFIG_REMOVAL_ACCEPTED'}
Write-Output 'C9R_CONFIG_INVARIANT_OK 2 accepted, 9 rejected'
