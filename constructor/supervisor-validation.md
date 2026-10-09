# SR-001 — Validação e cobertura

09/10/2026. Componente separado do Worker, autorizado somente para esta conversa. Contrato e fases: [plano](supervisor-resume-plan.md). Artefatos distribuídos sem dados privados: `src/supervisor/`; instalação privada e tarefas Windows descobertas/configuradas, sem tokens copiados.

## Comprovado

- `node supervisor/test-core.mts`: limiar inclusivo de 10%, timestamp reset+60s, identidade/ciclo, coalescência de janelas simultâneas, persistência antes de envio, rejeição de telemetria ausente/antiga, quota não restaurada, backoff, sessão/dependências/rede indisponíveis, falha ambígua, retomada lógica após falha, ausência de resposta, erro/eco, duplicidade e confirmação somente com recibo correlacionado.
- Consulta real pelo app-server: conta autenticada, janelas com usedPercent/resetsAt, conversa/cwd corretos, paginação oficial de turnos e itens acessível sem inferência.
- Instalação real seguida de reinstalação idempotente: prontidão de autenticação, destino, MCP, monitor e modelo Ollama; a tarefa de detecção executou autonomamente e persistiu MONITORING. Nenhuma mensagem foi enviada nessa passagem porque a cota não atingira o limiar.
- PowerShell: parser dos scripts aprovado; tarefas usam Windows Script Host oculto, token interativo limitado, IgnoreNew, mutex entre instalação/execução, logon, StartWhenAvailable e WakeToRun. Registro e parâmetros verificados na máquina.
- Falhas reais do instalador identificadas e corrigidas: inventário de recuperação pressupunha script não instalado; comparação de diretório não normalizava prefixo Windows de caminho longo. Reinstalação preservou estado e concluiu.

## Execução real e defeitos encontrados

O evento explícito enviou exatamente `continue` e abriu novo turno nesta conversa. Disparo do SO cerca de 1s depois do horário configurado; envio concluído cerca de 13s depois do prazo lógico, incluindo prontidão. Recibo CLI real: ID da fila distinto do ID/clientId da mensagem recebida; a primeira implementação somente entendia recibo JSON. O app-server separado também apresentava turno ativo como interrompido, ao contrário da projeção persistida e da UI.

Durante a validação a cota realmente se esgotou e a revisão automática recusou instalação externa. O componente já instalado detectou saldo <=10% e agendou para o reset oficial +60s; após a restauração natural, retomou o chat. Contudo, a telemetria refinou resetsAt em 1s e a versão instalada criou DOIS eventos/envios para o mesmo ciclo. Isso reprova o aceite de unicidade daquela versão; os recibos históricos foram preservados.

Correções: identidade persistente de episódio em cycles.json, refinamento do horário sem nova identidade, validação de nova janela; parser estrito do recibo textual e observação somente leitura da fila para correlacionar clientId; estado/primeira mensagem/resposta final lidos na projeção persistida por thread/turn. Testes dirigidos incluem refinamento de timestamp antes/depois do envio, ciclo subsequente, ID de fila diferente do clientId, resposta real e projeção inProgress. Nenhum envio histórico foi repetido para corrigir metadados. A confirmação real foi concluída aproveitando o envio residual existente, conforme evidência abaixo.

A fila real ainda retinha a segunda mensagem residual. Foi confirmado seu schema `UserInput.client_id`, utilizado pelo `clientId` recebido no histórico. A recuperação desse recibo usa somente leitura e o ID exato da fila já registrado; não cria novo teste nem terceiro envio. A versão corrigida foi instalada e recuperou/persistiu queueId e messageClientId desse evento, mantendo attempts=1 e AWAITING_RESPONSE. A confirmação distinguirá outro `continue` manual/concorrente pela identidade do cliente. O envio residual existente será aproveitado para validar a próxima resposta; não se afirma confirmação antes de sua conclusão. Instalação concorrente com execução do monitor é recusada pelo mutex e pode ser retomada, sem interromper o processo.

O envio residual abriu o turno seguinte. A confirmação foi desacoplada de rede/autenticação, do backoff e da janela dos últimos 20 turnos: leitura local por thread+clientId, primeira mensagem e resposta final canônicas. Os testes comprovam isolamento entre threads, identidade diferente na fila/recepção, mensagem concorrente distinta, status inProgress e final completed. A passagem local não envia mensagens nem declara conclusão antes do final persistido.

## Confirmação real concluída

O evento `e547e1fd48d9b90b382363c222adfffabcd84bc287cfb74521fab226f5469046` foi confirmado pelo runtime como **COMPLETED**, com origem `persisted-client-id`, turno `01a11f74-bc0d-7452-bcca-5a78630dac6b`, resposta `msg_09b69312917c37eb016ac8919e928887d289093f8211bde708` e SHA-256 `50182ef5503137e0fc4df431fab026c277596065ec796b11291e321fc8f8e187`. A ligação usa o clientId capturado no item exato da fila, sem atribuição por coincidência temporal e sem reenvio.

A confirmação revelou diferença real de schema: SQLite guarda `phase=final_answer`, enquanto a API apresenta `final`. O adaptador agora traduz somente o item apontado por `final_agent_item_id`; teste usa o formato efetivamente observado. O contador legado attempts=2 incluía um timeout de consulta (`RPC_TIMEOUT:thread/turns/list`), não outro envio desse evento. A consulta correlacionada deixou de usar RPC; novas operações separam sendAttempts/recoveryAttempts e classificam erro de confirmação como CONFIRMATION_RETRY. O diagnóstico antigo foi preservado para auditoria.

Isso comprova o caminho real de retomada e confirmação recuperada. Não apaga a duplicidade histórica do ciclo original nem substitui um novo ciclo natural de quota para validar a deduplicação corrigida em produção; esse comportamento foi validado por testes determinísticos com refinamento de timestamp. Não foi enviado novo `continue` para completar esta verificação.

## Limites de evidência

Sessão expirada, indisponibilidade, reboot lógico e falha parcial foram injetados na máquina de estados. Não houve reboot físico, encerramento forçado do Desktop, remoção do Worker ativo nem expiração deliberada de autenticação neste computador. Injeção não comprova recuperação integral desses incidentes reais. A restauração natural de quota foi observada; não foi antecipada nem consumida artificialmente.

O transporte `codex queue` não anuncia opção de chave idempotente. Sem ID de mensagem verificável no recibo, coincidência temporal de `continue` e resposta final fica em RESPONSE_OBSERVED_UNCORRELATED; o contrato proíbe promover isso a COMPLETED. Computador desligado, ausência de logon/rede, renovação que exija ação humana e atraso do Agendador impedem promessa temporal absoluta. Melhor alternativa implementada: agenda persistente exata, recuperação gratuita após disponibilidade, isolamento, diagnóstico e nenhum reenvio cego.
