# FT-INSTALL-MUTEX-WAIT-I6W

Atualização E9P instalou o Worker, mas o instalador de recuperação recusou mutex ocupado antes de copiar seus arquivos. A recusa é segura, porém `WaitOne(0)` exige repetição externa mesmo numa contenção transitória; o mesmo impedimento já foi observado em atualização anterior. Não há prova de deadlock ou de processo órfão.

Supervisor C=8/exclusivo: acrescentar espera opcional de mutex no instalador oficial existente, com tempo técnico configurável e padrão180s. Padrão sem opção continua imediato. O fluxo interno de atualização passa a solicitar a espera. Usar espera de kernel, sem polling, interrupção do titular, lock roubado, reinício de serviço ou alteração de autorização. Timeout preserva diagnóstico/estado; não transformar espera em sucesso. Mutex abandonado mantém tratamento anterior.

Alvos: `supervisor/install.ps1`, espelho automático, helper interno de instalação, teste isolado e documentação. Sem alterar runtime, tarefas de boot/logon, callbacks ou limites do Worker. Teste Windows real com dois processos/evento de prontidão: recusa imediata, timeout limitado, aquisição após liberação, liberação e reaquisição. Processo auxiliar oculto, sem dependência externa ou intervenção no runtime instalado.

Após teste/sincronização/commit/push, repetir somente as instalações de recuperação pendentes e verificar a instalação E9P; não reinstalar o Worker já atualizado, reanalisar jobs ou reenviar mensagens. Configurações e controles anteriores permanecem referências de preservação. Essa etapa resolve a contenção normal, não promete recuperar um titular travado sem diagnóstico.
