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


## Probe persistente integrado — após instalação

Core760eed1 e integração49e92b5 concluídos; dez testes fonte/instalado passaram, guardas e preferências preservadas. Probe adicional cobre transporte MCP/worker-runner/resultado+artefato real, que não é exercitado só pela chamada direta runLocalAnalysis.

C5/júnior estritamente para três comandos sintéticos read-only e saída finita, sem manutenção do core C8, sem inferência ou negócio. IDs d8o_first/d8o_middle/d8o_last; oracle independente fixa2200/2200/10000 repetições de á😀 e stderr porID. Um recibo>24K/agregado>16K devem gerar índice<=16K e JSONíntegro com três textos/hashes/ordem/pointers. Nenhum comando executa histórico ou grava arquivos de negócio; somente runtime escreve artefatos exclusivos do novo job.

command_sequence/requiredcommands exatos, expect_changesfalse/commit_policysupervisor, Node absoluto,15s/comando/networkfalse/repeatablefalse. SemR8V deliberadamente: validar a rota legada que cortava; não altera contrato de outro job. Fonte/installedhash/identidade/cwd/ACTIVE/preflight SW-HYBRID conferidos. Scoped75b9c575259a4754d6c561501bc3ba559d5ba1679e14c74ff47089414f222c9; pedido/oracle privados d8o-live-request.json/d8o-live-oracle.json.

Receber RUNNING uma vez, preservarhandoff/links/N7C ou impedimento e encerrar sem polling. Callback local_result uma vez→ler somente artefato indicado/conferirhash/JSON/payloads contraoracle→revisão/Q8S. Não recontar probe na captura histórica453 ou atribuir cognição a command_sequence. Em seguida retomar66pendentes sem replay de buscas antigas.
