# D8O — validação da preservação de saída

## Fonte funcional concluída

Correção causal de worker-core: command_sequence conserva recibos completos de comandos até o buffer existente, inclusive a primeira falha. Sem alterar inferência, permissões, ordem, stop-first-error, callbacks ou intenção humana. Saída pequena mantém formato; agregado>16K fica em command-sequence-result.json (schema localworker-command-receipts/v1), com IDs/exit_code/texto/contagens/hashes. Retorno ao chat é índice explícito<=16K, caminho/hash/pointers, nunca stdout integral disfarçado. Guardas24K de contexto da inferência permanecem; limites4MiBexec/16MiBevidência/16MiBartefato não foram elevados.

FonteSHA3eab1bd35c9d65b09cbcf5602aaded704dd9d200a8e16e499ce552c3075abe7c; artefatoSHA3eab1bd35c9d65b09cbcf5602aaded704dd9d200a8e16e499ce552c3075abe7c. Fonte/transpilado e espelhos conferidos pelo sync-src:53artefatos consistentes. Alterações em RCF/howto/README nesta unidade são somente projeções geradas de hashes, sem mudança normativa para legitimar truncamento.

## Execução real

Teste constructor/test-deterministic-output-preservation.mts e derivado.mjs chama runLocalAnalysis e executa Node em fixtures temporárias desta raiz; nenhum Ollama, negócio externo ou repositório novo. Dez cenários aprovados: SMALL_UNCHANGED, AGGREGATE_UNICODE_HASHES_ORDER_NO_REPLAY, IDENTICAL_ARTIFACT_IDEMPOTENT, SINGLE_OVER_24K_PRESERVED, CONFLICT_FAIL_CLOSED, PERSISTENCE_INVALID_TARGET_FAIL_CLOSED, HARDLINK_FAIL_CLOSED, FAILURE_STDOUT_STDERR_FIRST_ERROR_NO_REPLAY, R8V_UNCHANGED_NO_REPLAY, NO_PERSISTENCE_FAIL_CLOSED. Oracle dos conteúdos é a fixture conhecida/JSON canônico, não uma cópia dos valores retornados pela implementação. Unicode, hashes, ordem, pointers, preservação de sentinela, ausência de completion em falha e ausência de replay conferidos.

Primeira tentativa do teste de hardlink sofreu EPERM do sandbox antes de exercer a guarda; execução aprovada fora do sandbox passou, com fixtures/limpeza confinadas a paths conhecidos. Não foi relaxada a guarda. R8V continua validando candidato original: saída extensa pode ser recusada, sem replay e com artefato preservado. Sem persistência, conflito/link/diretório inválido ou orçamento excedido, não há falso COMPLETED.

Prova privada:d8o-source-validation.json. Instalação/probe instalado ainda pendentes neste commit funcional. Evidência histórica truncada não foi reescrita nem buscas reexecutadas. Auditoria permanece387/453 examinados,66pendentes; CANCELLED excluídos.


## Instalação e integração concluídas

Unidade funcional760eed1 versionada e enviada; atualização oficial update-installed.ps1 aplicada em2026-10-25T11:26:33.263Z, com backups/guarda de job ativo/validação dos módulos. Runtime instaladoSHA3eab1bd35c9d65b09cbcf5602aaded704dd9d200a8e16e499ce552c3075abe7c igual ao derivado fonte. Preferências de modelo/contexto/limites/híbrido/caminhos preservadas; hashes do config.toml do Desktop e controles de continuidade das duas conversas inalterados. Nenhum app reaberto/chat rearmado/modelo trocado. Prova:d8o-install-proof.json.

O primeiro probe instalado foi bloqueado pela guarda por ausência de contrato, antes do comando: não é teste aprovado. Correção material somente no harness, com avaliação explícita C5 para o microescopo de comandos sintéticos de saída/read-only, hash e validação SW-HYBRID; a alteração do core permanece C8/exclusiva. Não foi desabilitada guarda ou transferido julgamento ao Worker. O harness verifica supervision_verified na instalação. Uma edição preliminar do harness falhou sua pré-condição sem gravar; o artefato antigo permaneceu recusado. Edição corrigida passou sintaxe e então o probe instalado completo passou os dez cenários, sem inferência/Workerjob/callback/negócio.

A prova instalada d8o-installed-validation.json confirma os mesmos dez casos, incluindo idempotência, falha parcial e hardlink. Fonte e instalado foram exercitados por runLocalAnalysis real; não é simulação de resultado nem validação de comportamento do Desktop. Testes usam UUIDs/fixtures próprios e limpam somente paths resolvidos dessas fixtures.

Limitação histórica: evidence.jsonl de40c17 tem hash/tamanho registrados na captura, mas não existe mais no path canônico capturado da instalação (ENOENT). Não houve varredura ampla, reconstrução de JSON, replay ou invenção de status dos recibos omitidos. A correção nova não convalida a integralidade daquele result.md antigo. Auditoria387/453,66pendentes permanece separada da conclusãoD8O.


## D8O — probe persistente concluído

bfaadeb9-b115-4c5c-8f16-e3d651ec0832 recebido uma única vez; exame concluído e Q8S10/revision1 registrado em2026-10-25T11:42:14.292Z. Fluxo real MCP→runner→resultado/artefato passou: três comandos conhecidos d8o_first/d8o_middle/d8o_last em ordem, exit0, stdoutJSON e stderr exatamente iguais ao oracle independente; Unicode, comprimentos UTF-16 e hashes UTF-8 conferidos. Recibos6696/6699/30093 caracteres, incluindo individual>24K e agregado>16K. Índice explícito1175 caracteres com pointers/hashes; não se apresenta como stdout integral. Artefato localworker-command-receipts/v1:87401 bytes/SHA256c7097fd5d1d8c391329c5a878e00a704c0a93048f6504c783a50e9cec7eea54a, arquivo regular/sem link/nlink1. Provas privadas d8o-live-return.json/d8o-live-verification.json/d8o-live-review.json; sem novo local_result, replay, inferência ou recontagem manual de latência.

Git determinístico do job:main...origin/main limpo em2026-10-25T11:36:23.223Z, anterior a este registro. C5 refere-se exclusivamente ao probe sintético; correção do core permanece C8/exclusiva. Este job não integra o corpus congelado453: auditoria387/453 delimitadamente examinados,66pendentes, CANCELLED excluídos. O teste comprova a nova preservação; não recupera nem convalida conteúdo histórico truncado. Nenhuma conversa rearmada, app reaberto ou configuração alterada. Próximo passo: nova unidade factual pequena usando projeções históricas já obtidas, sem repetir exames publicados.
