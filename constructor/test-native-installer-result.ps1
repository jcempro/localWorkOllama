$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'native-installer-result.ps1')
$nodeTestC9R=(Get-Command node.exe).Source
$logTestC9R=Join-Path $PSScriptRoot ('audit-private/native-result-'+[guid]::NewGuid().ToString('N')+'.log')
try{
  Invoke-NativeInstallerC9R -Program $nodeTestC9R -ArgumentList @('-e','console.error(123);console.log(456)') -LogPath $logTestC9R
  $textTestC9R=Get-Content -LiteralPath $logTestC9R -Raw
  if($textTestC9R -notmatch '123' -or $textTestC9R -notmatch '456'){throw 'DIAGNOSTIC_LOST'}
  $failedTestC9R=$false
  try{Invoke-NativeInstallerC9R -Program $nodeTestC9R -ArgumentList @('-e','console.error(789);process.exit(3)') -LogPath $logTestC9R}catch{if($_.Exception.Message -notmatch 'NATIVE_INSTALLER_EXIT_3_'){throw};$failedTestC9R=$true}
  if(-not $failedTestC9R){throw 'FALSE_SUCCESS'}
  if($ErrorActionPreference -ne 'Stop'){throw 'PREFERENCE_NOT_RESTORED'}
  Write-Output 'PASS native installer: stderr retained, exit0 accepted, exit3 rejected, preference restored'
}finally{if(Test-Path -LiteralPath $logTestC9R){Remove-Item -LiteralPath $logTestC9R}}
