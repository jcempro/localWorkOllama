# FT-CONTINUITY-U6C — evidência

## Correção

Fonte comum observa sessão do Windows e janela/PID/início do Desktop, sem iniciar aplicativo. SR-001 exige autorização explícita por conversa; ausência/legado, reboot, troca/fechamento do Desktop, pausa, interrupção/substituição e conclusão do trabalho impedem envio/ativação. O adaptador instalado obrigatoriamente fornece a guarda; ausência pausa. Removidos logon/boot, StartWhenAvailable e WakeToRun das tarefas SR-001. Recuperação de serviços/rede mantém autoridade válida. Confirmação continua exigindo resposta real e nunca reenvia tentativa incerta.

Callback do Worker captura sessão/instância/turno no início, revalida antes de enviar e permanece PAUSED_USER/not_sent em revogação. Resultado/inferência não são repetidos. Retomada explícita permite somente entrega comprovadamente não enviada; recibos aceitos/ambíguos não são repetidos. Histórico pausado comprovadamente não enviado segue retenção existente; incerto permanece protegido. Cópia de recuperação inclui também a guarda híbrida importada pelo servidor atual.

## Testes executados

- `constructor/test-continuity-intent.mts`: sensores/CLI/RPC isolados; boot, app fechado/reaberto, legado, origem interrompida/substituída, fechamento entre preparo/envio, autorização ausente, pausa persistente, Resume explícito, callback válido único e cancelamento. Runtime real de entrega e SR-001, sem mensagem real nem alteração do alvo. Cota baixa + turno concluído não produz evento. Stub do ensaio inicialmente omitia um export; corrigido, sem alteração da guarda para acomodar teste. Handles SQLite são fechados inclusive em falha do ensaio.
- `supervisor/test-core.mts`: limites/horário/quota/identidade/recepção/erro/idempotência e nova instância pausada, mantendo confirmação e ausência de reenvio.
- `localworker/test-integration.mjs`: MCP real com Ollama/CLI simulados; COMPLETED `cbbf8121-daad-437f-b579-bf6ec9627938`; falha HTTP `a7f34c1f-4590-4fe0-a16d-40bb70ef1c15`; duas entregas previstas, duas inferências simuladas, órfão legado PAUSED_USER, Git preservado e fixtures removidos pelo mecanismo canônico. Não houve envio a conversa real.
- `localworker/test-history.mjs`: retenção de pausado comprovadamente não enviado; ativo, ambíguo, pausado sem prova e árvore irregular preservados. Restrição do temporário sandbox negou rename; execução autorizada em temporário isolado passou, sem contornar recusa de revisão.
- Parser PowerShell aprovado; observação real retornou bootId/desktopInstance sem abrir/fechar aplicativos. Espelhos/TS→JS/documentação gerados por `scripts/sync-src.mjs` (44 artefatos).

## Limites e ativação

Sete tarefas SR-001 de propriedade comprovada foram desabilitadas preventivamente. Instalação definitiva e verificação das tarefas estão pendentes neste checkpoint. Não houve reboot físico nem fechamento do Desktop em uso para alegar teste integral desses incidentes. Ausência de processo não revela intenção/crash com certeza: comportamento conservador pausa. Observador Windows implementado; Linux/outros sem adaptador ficam bloqueados, sem alegar instalação compatível.

`codex queue --help` do executável instalado não oferece revogação. Mensagem anteriormente aceita pode ser consumida pelo próprio Desktop quando aberto manualmente; integração não altera a fila via SQLite nem promete cancelamento inexistente. Guardas impedem novos envios/ativações sob autorização revogada. Fonte oficial consultada: https://developers.openai.com/siwc/token-sharing-open-source/codex-app-server ; estado final real e interrupção são distintos. Limitação/semântica de intenção provêm da inspeção dos adaptadores locais, não de uma API presumida.

Auditoria anterior continua limitada à captura de 197 jobs. Nova captura privada de 264 (um CANCELLED excluído) foi preservada; 67 adicionais ainda não têm aceite integral. Dois achados concretos aguardam investigação após esta prioridade: capacidade contextual em 0ceda154 e runner ausente em 4cb8cc24. Não se declara conclusão de FTs do blog.
