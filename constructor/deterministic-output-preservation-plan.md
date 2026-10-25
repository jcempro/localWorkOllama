# D8O — preservação de recibos determinísticos

Origem: auditoria histórica vigente,40c17ac8/resultado recebido por440890c9, solicitação humana de corrigir causas/omissões sem regressões. Vinculado ao mestre audit-reconcile-2026-10-23.md e contrato existente RCF de command_sequence, evidência e conclusão verificável; não altera Norma/autoridade nem redefine sucesso para justificar corte. FT de correção de implementação, sob autorização vigente.

## Diagnóstico e escopo

worker-core.mts runAuthorizedCommand compacta cada recibo em24K; final semR8V compacta agregado em16K. O result.md original f71b0a1f contém corte no meio de JSON e perdeu meianoite_pdf, apesar de seis exit0. Evidência histórica permanece intocada.

C8/exclusivo: core de execução/persistência afeta segurança, orçamento, testes e consumidores. Todas as etapas/risco/aceite no supervisor; sem Worker. Mudar somente caminho command_sequence e representação derivada, testes/espelhos/documentação. Inferência, privilégios, comandos, ordem, cancelamento, callbacks, intenção humana e modelo/esforço preservados.

## Implementação mínima

- Sequência recebe recibo completo até limites de execução já existentes; contexto de modelo continua limitado.
- Evidência operacional mantém teto16MiB e execFile4MiB por stream; nenhuma elevação cega.
- Se agregado exceder16K, salvar JSON versionado de recibos sob diretório exclusivo do job, com IDs/ordem/texto/hashes e metadados; retornar índice limitado16K com caminho/hash/pointers e indicação inequívoca da externalização. Sem cortar JSON.
- Sem job persistente, conflito, falha de integridade/persistência ou orçamento insuficiente: diagnóstico fail-closed, sem falso COMPLETED, replay ou relaxar R8V. Retornos pequenos permanecem byte a byte. Contrato R8V continua validando candidato original e pode recusar saída extensa; artefato preserva execução sem reexecutar comandos.
- JSON é evidência privada do job; exclusão/retenção oficiais por diretório continuam abrangentes. Não expor conteúdo em telemetria/monitor.

## Validação e entrega

Teste real runLocalAnalysis/Node com comandos sintéticos conhecidos e nenhum Ollama/negócio: JSON pequeno inalterado; três recibos agregados>16K; comando individual>24K; Unicode/hashes/ordem/exatidão; R8V rejeitado sem replay; conflito/persistência falha não concluem; sem job persistente não afirma sucesso. Fixture/temporários dentro desta raiz, sem novo Git/repo externo. Verificar fonte/transpilado/espelho e executar gate pertinente. Commit funcional imediato/push; depois atualização oficial preservadora da instalação e probe real isolado, sem rearmar chats/abrir app ou mudar preferências. Auditoria restante66 não está concluída.
