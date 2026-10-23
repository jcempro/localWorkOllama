# FT-MONITOR-STATUS-S6D

Continua a auditoria, após aceite R8V ec68b9b2. Evidência: chamada local_status do catálogo residente retornou WORKER_INFRA_ERROR/monitor não iniciou em6s; a ponte instalada recuperou o resultado terminal. Fonte atual de server.mjs confirma ensureMonitor obrigatório após snapshot, que converte falha da UI em falha da consulta. Causa imediata do servidor não iniciar no processo residente não comprovada; não atribuir à inferência, hardware ou job.

## Escopo e risco

C8, exclusivamente supervisor: alteração de endpoint/runtime/contrato distribuído. Manter reconciliação existente, estado real e diagnóstico. Nenhum novo job, inferência, permissão, entrega/rearme ou mudança de modelo. Não repetir ec68b9b2,6d395cf9 ou históricos. Não mudar local_analyze: criação exige interface de acompanhamento conforme contrato existente. local_monitor continua falhando explicitamente quando não conseguir fornecer interface. local_result já é independente e permanece assim.

## Contrato e unidades

1. Consulta de local_status retorna snapshot real mesmo se ensureMonitor falhar. Acrescenta monitor_status AVAILABLE/UNAVAILABLE; URLs normais no sucesso, null quando indisponível; monitor_error sanitizado/limitado, sem capability/path privado. Falha da consulta/reconciliação não é suprimida. Uma tentativa canônica por chamada, sem polling novo. Registrar RCF/howto e estado desta unidade antes da implementação.
2. Teste MCP stdio real em fixture isolada sob este repositório: monitor disponível/indisponível, estado terminal/ativo, erro de job continua erro, local_monitor não inventa sucesso; resultado/Q8S não dependem da UI. Injetar somente o adaptador do monitor na cópia de fixture, jamais alterar serviço real nem ocupar portas do usuário. Não criar callbacks reais ou executar negócio. Validar equivalência src.
3. Commit/push da unidade funcional, instalação oficial silenciosa e preservadora; conferir hashes/config/autorizações. Sem interromper apps ou rearmar conversas. Prosseguir auditoria com evidências congeladas.

## Estado

Contrato publicado em a5d5533. Endpoint agora tem fonte canônica server.mts, artefato gerado e seleção positiva nos instaladores/recuperações. Teste `node --experimental-strip-types constructor/test-monitor-status.mts` passou com MCP stdio real e filesystem isolado: estados RUNNING/COMPLETED, UI disponível/EACCES/timeout, uma tentativa por consulta, sem URL inventada/segredo/alteração de estado, erro de leitura preservado, local_monitor falha explícita e local_result/Q8S independentes. Sem inferência, callback ou negócio executados. Instalação real pendente; defeito próprio do produto, núcleo upstream intocado.

## Instalação e aceite

Implementação67029d2 publicada. Instalação oficial via Windows PowerShell5.1 concluída; Worker e duas recuperações conferem fonte/artefato/manifesto, inclusive server.mts/server.mjs. Prova privada `audit-private/s6d-install-5959fa2f-db36-478b-bea8-f10a7f8f4a8a/installed-proof.json`, SHA256 `5eb50faf9c1b3c667d3550a0f1922d12d866a33c444b2a620324fa1f24936325`,2026-10-23T18:29:28.8475155Z. Configurações e autorizações ACTIVE/EXPLICIT_RESUME e PAUSED/EXPLICIT_PAUSE preservadas, sem boot/logon/wake/catchup ou envio/inferência/rearme durante instalação.

Consulta única de verificação pela ponte instalada retornou COMPLETED/monitor_status AVAILABLE e links válidos para ec68b9b2, mantendo entrega PAUSED_USER; não repetiu local_result nem inferência. Falhas da UI verificadas por injeção no adaptador da fixture, não por interrupção do painel do usuário. S6D aceita no escopo. Catálogo residente antigo pode continuar executando módulos anteriores até recarga; usar ponte atualizada, sem reabrir aplicativo encerrado ou modificar intenção humana. A causa física do timeout residente não foi provada; acoplamento do endpoint foi removido para todas as falhas da tentativa de recuperação, sem ocultá-las.
