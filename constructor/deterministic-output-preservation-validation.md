# D8O — validação da preservação de saída

## Fonte funcional concluída

Correção causal de worker-core: command_sequence conserva recibos completos de comandos até o buffer existente, inclusive a primeira falha. Sem alterar inferência, permissões, ordem, stop-first-error, callbacks ou intenção humana. Saída pequena mantém formato; agregado>16K fica em command-sequence-result.json (schema localworker-command-receipts/v1), com IDs/exit_code/texto/contagens/hashes. Retorno ao chat é índice explícito<=16K, caminho/hash/pointers, nunca stdout integral disfarçado. Guardas24K de contexto da inferência permanecem; limites4MiBexec/16MiBevidência/16MiBartefato não foram elevados.

FonteSHA3eab1bd35c9d65b09cbcf5602aaded704dd9d200a8e16e499ce552c3075abe7c; artefatoSHA3eab1bd35c9d65b09cbcf5602aaded704dd9d200a8e16e499ce552c3075abe7c. Fonte/transpilado e espelhos conferidos pelo sync-src:53artefatos consistentes. Alterações em RCF/howto/README nesta unidade são somente projeções geradas de hashes, sem mudança normativa para legitimar truncamento.

## Execução real

Teste constructor/test-deterministic-output-preservation.mts e derivado.mjs chama runLocalAnalysis e executa Node em fixtures temporárias desta raiz; nenhum Ollama, negócio externo ou repositório novo. Dez cenários aprovados: SMALL_UNCHANGED, AGGREGATE_UNICODE_HASHES_ORDER_NO_REPLAY, IDENTICAL_ARTIFACT_IDEMPOTENT, SINGLE_OVER_24K_PRESERVED, CONFLICT_FAIL_CLOSED, PERSISTENCE_INVALID_TARGET_FAIL_CLOSED, HARDLINK_FAIL_CLOSED, FAILURE_STDOUT_STDERR_FIRST_ERROR_NO_REPLAY, R8V_UNCHANGED_NO_REPLAY, NO_PERSISTENCE_FAIL_CLOSED. Oracle dos conteúdos é a fixture conhecida/JSON canônico, não uma cópia dos valores retornados pela implementação. Unicode, hashes, ordem, pointers, preservação de sentinela, ausência de completion em falha e ausência de replay conferidos.

Primeira tentativa do teste de hardlink sofreu EPERM do sandbox antes de exercer a guarda; execução aprovada fora do sandbox passou, com fixtures/limpeza confinadas a paths conhecidos. Não foi relaxada a guarda. R8V continua validando candidato original: saída extensa pode ser recusada, sem replay e com artefato preservado. Sem persistência, conflito/link/diretório inválido ou orçamento excedido, não há falso COMPLETED.

Prova privada:d8o-source-validation.json. Instalação/probe instalado ainda pendentes neste commit funcional. Evidência histórica truncada não foi reescrita nem buscas reexecutadas. Auditoria permanece387/453 examinados,66pendentes; CANCELLED excluídos.
