function Select-SupervisorInstallationTasksC9R {
  param([object[]]$Tasks)
  $namePatternC9R='^CodexSupervisorResume-[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}(?<event>-[a-f0-9]{24})?$'
  foreach($taskC9R in $Tasks){
    if($taskC9R.TaskName -notmatch $namePatternC9R){throw 'UNEXPECTED_SUPERVISOR_TASK_NAME'}
    # platform.ps1: tarefa de evento = prefixo da instalacao + 24 hex do evento.
    if(-not $Matches['event']){$taskC9R}
  }
}
