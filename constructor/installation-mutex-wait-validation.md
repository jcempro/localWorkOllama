# I6W — validação

Supervisor C=8/exclusivo. O instalador oficial ganhou `-WaitForIdle` e `-IdleWaitSeconds` (padrão180, intervalo1..3600s); sem a opção mantém aquisição imediata. Função `Enter-InstallationMutexI6W` usa espera do kernel e o tratamento anterior de mutex abandonado, sem polling, término do titular ou apropriação indevida. Timeout falha antes da cópia protegida. O helper interno solicita a espera em atualizações.

Teste executado com Windows PowerShell5.1: `powershell.exe -NoProfile -NonInteractive -File constructor/test-installation-mutex-wait.ps1` — `I6W_MUTEX_REAL_PROCESSES_IMMEDIATE_TIMEOUT_RELEASE_REACQUIRE_OK`. O teste importa somente a função real por AST e usa mutex/evento exclusivos, segundo processo oculto e espera finita. Comprova recusa imediata, timeout sem sucesso falso, aquisição após liberação e reaquisição. Não executou instalador completo, alterou runtime, enviou chats ou reiniciou processos.

Próximo passo: sincronizar/commit/push e atualizar somente as recuperações pendentes de E9P; Worker já atualizado não deve ser reinstalado. Conferir seu backup original/configuração e controles de autorização, core/cópias/manifestos, sem boot/logon/wake/catchup ou mensagens. Uma espera esgotada exige diagnóstico; o recurso não afirma corrigir deadlock não observado.
