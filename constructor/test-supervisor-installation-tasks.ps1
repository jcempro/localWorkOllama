$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'supervisor-installation-tasks.ps1')
$prefixTestC9R='CodexSupervisorResume-00000000-1111-2222-3333-444444444444'
$rootTestC9R=[pscustomobject]@{TaskName=$prefixTestC9R}
$eventTestC9R=[pscustomobject]@{TaskName=($prefixTestC9R+'-'+('a'*24))}
$rootsTestC9R=@(Select-SupervisorInstallationTasksC9R -Tasks @($rootTestC9R,$eventTestC9R))
if($rootsTestC9R.Count -ne 1 -or $rootsTestC9R[0].TaskName -ne $prefixTestC9R){throw 'ROOT_EVENT_CONFUSION'}
if(@(Select-SupervisorInstallationTasksC9R -Tasks @($eventTestC9R)).Count -ne 0){throw 'EVENT_IS_NOT_INSTALLATION'}
foreach($badTestC9R in @('CodexSupervisorResume-unknown',($prefixTestC9R+'-abc'),($prefixTestC9R+'-'+('x'*24)))){
  $rejectedTestC9R=$false
  try{Select-SupervisorInstallationTasksC9R -Tasks @([pscustomobject]@{TaskName=$badTestC9R})|Out-Null}catch{if($_.Exception.Message -ne 'UNEXPECTED_SUPERVISOR_TASK_NAME'){throw};$rejectedTestC9R=$true}
  if(-not $rejectedTestC9R){throw 'UNKNOWN_TASK_ACCEPTED'}
}
Write-Output 'PASS installation discovery: root selected; canonical event excluded; unknown names rejected'
