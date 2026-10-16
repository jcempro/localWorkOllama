# Auditoria incremental — captura de 15/10/2026

Base privada: `audit-private/2026-10-15-current/inventory.json`, SHA256 `37daad80df90ccc04669f35a56fcd6ad70fdd6368a9b97315121c0bf44fad3f9`. Captura: 264 jobs não cancelados; 67 posteriores à captura anterior. Este checkpoint revisa 15 deles; não substitui o aceite dos outros 52.

## Segmento 01

Job de auditoria `18403d1a-e73c-4b97-83ef-9412fd725a2e`: COMPLETED em 15/10 às 23:19:36 UTC; uma inferência, 14.113 tokens de entrada/1.103 de saída, nenhuma ferramenta, nenhuma escrita/commit. Fonte: evidência fornecida pelo supervisor; não inspeção própria do Worker. `local_result` foi chamado uma vez, mas o transporte estava fechado após a aposentadoria do MCP antigo; resultado obtido por state.json/result.md persistidos, sem repetir chamada ou análise.

Aceite **parcial com correções do supervisor**: falha de precisão semântica, não falha de infraestrutura. O Worker extrapolou ausência de campos para negações globais; o recorte não incluía mode nem todos os sucessores. A revisão conferiu somente os registros fornecidos e seus campos de modo/contagem no inventário já capturado. Não reexecutou trabalho histórico.

| ID | Retorno efetivo | Revisão fundamentada |
| --- | --- | --- |
| ff4dda85 | FAILED/WORKER_INCOMPLETE; sete leituras obrigatórias pendentes, zero read_file bem-sucedida. | Diagnóstico solicitado não entregue. Ausência de correção **no recorte** não prova que nunca houve recuperação posterior. |
| d57cd733 | FAILED/WORKER_INCOMPLETE; duas leituras obrigatórias pendentes, **seis outras leituras bem-sucedidas**; mode=write/expect_changes=true. | Não afirmar ausência de qualquer leitura. ENOENT em arquivos de FT ainda ausentes não comprova path de repositório errado. Registro/plano não foi concluído. |
| ca6bcea3 | FAILED/WORKER_INCOMPLETE; resposta final sem inspeção após orientação explícita; prove_ial não executado. | Erro literal é ausência de inspeção, não CONTRACT_UNFULFILLED. Sucessor cee6b553 referencia expressamente esse job. |
| cee6b553 | COMPLETED; sequência prove_ial exit0, saída HTML/atributo/versão observáveis; mode=read-only. | Aceita a prova delimitada do parser. Não comprova implementação/aceite global de tabelas ou TTS. |
| 2d6789a3 | FAILED/WORKER_INCOMPLETE; quatro leituras bem-sucedidas; test pendente; mode=write/expect_changes=true. | Cobertura de referências e variante requerida não foi entregue nessa unidade. |
| 29ac7c19 | COMPLETED; patch e test exit0, HEADER_VARIANT_PATCH_OK e table_speech=ok; mode=write/expect_changes=true. | Recuperação reduzida à variante tbody/TH; referências foram explicitamente deixadas para outra unidade. Não afirmar ausência de alteração nem conclusão do escopo inteiro de 2d6789a3. |

A afirmação do relatório de que todos os jobs eram somente leitura e nenhum alterou arquivos foi rejeitada. Permissão, execução, mudança líquida e autoria são fatos distintos; os campos ausentes não autorizam inferir nenhum deles. O comando patch bem-sucedido contradiz a generalização, mas não demonstra por si só todo o conteúdo/qualidade do patch. A seção Git determinística do **job auditor** é `main...origin/main` limpo neste repositório; não descreve o blog histórico. O recorte de 29ac7c19 registra `dev...origin/dev [ahead 11]` e alterações herdadas, sem atribuir todas ao job.

Causas já cobertas pelos controles anteriores: contrato não cumprido, exploração em vez de efeito, ausência de segmentação/execução obrigatória; sequências determinísticas recuperaram unidades delimitadas. Não há, nesses seis registros, prova de novo defeito de permissões ou do parser Ollama. Precisão semântica permanece sujeita à revisão proporcional; não prometer infalibilidade de texto gerado. Nos próximos segmentos, incluir modo e limites de cobertura explicitamente e preferir extração determinística para campos mecânicos; não repetir este segmento para fabricar um relatório correto.

## Segmento 02

Job auditor `4c898543-0325-4a05-b1a9-5f8c8fbb6dae`: COMPLETED em 15/10 às 23:41:29 UTC; uma inferência, 13.382 tokens de entrada/599 de saída, nenhuma ferramenta ou escrita, como solicitado. Transporte MCP fechado na única chamada de resultado; leitura dos artefatos persistidos, sem nova inferência. A seção Git determinística é `main...origin/main` limpo, referente a este auditor, não ao estado histórico do repositório auditado.

Aceite **parcial com correções**. Modo e contagens fornecidos reduziram as generalizações anteriores, mas o texto não citou as linhas solicitadas e contou incorretamente as tentativas de edição do terceiro registro. A revisão abaixo usa exclusivamente a mesma evidência fornecida, sem repetir exploração ou negócio.

| ID | Retorno efetivo | Evidência e obrigação pendente |
| --- | --- | --- |
| d7a0443d | FAILED/WORKER_INCOMPLETE, resposta final sem inspeção após orientação explícita; read-only. | Zero read_file bem-sucedida; cinco leituras obrigatórias declaradas. Levantamento de gates FT-104/FT-105 não entregue. O recorte não contém eventos agrupados de ferramenta; a contagem e o diagnóstico são campos explícitos do inventário, não citações de linhas inexistentes. |
| c783f2b4 | FAILED/WORKER_INCOMPLETE por ausência de progresso verificável; write/expect_changes=true. | Oito leituras bem-sucedidas; edit_file falhou na linha 20 por âncora ausente/não única. Leituras repetidas sem progresso nas linhas 44/52/67/70; test_accessible pendente na linha 60; bloqueio de estratégia na 69. Zero mutações diretas/command exit0 comprovados. |
| 567e8a54 | FAILED/WORKER_INCOMPLETE por ausência de progresso; write/expect_changes=true. | Seis leituras bem-sucedidas; **quatro erros de edit_file**, linhas 14/45/61/87, mais **uma recusa**, linha 29; não apenas duas tentativas. Bloqueios nas linhas 28/86. syntax pendente; zero mutações diretas/command exit0 comprovados. |

Os bloqueios impediram falso sucesso e repetição ilimitada; não comprovam defeito de permissão. A âncora textual inválida e a repetição de leituras caracterizam estratégia improdutiva; não autorizam ampliar acesso automaticamente. A seção NEEDS_SUPERVISOR do auditor é uma recomendação textual sobre registros históricos, **não** reclassificação de seus error_kind nem prova de autorização ausente. Nenhum desses registros contém avaliação de risco, e WORKER_INCOMPLETE sozinho não determina sua causa. Recuperações posteriores ficam indeterminadas neste recorte. A correção da omissão de citações/contagens usa extração determinística dos campos já registrados, sem redelegar a mesma análise ou relaxar guardas.

## Segmento 03

Job auditor `277d10e4-c24f-4b94-a0a8-0ba3cb5a475a`: COMPLETED em 16/10 às 00:08:08 UTC. Resultado consultado uma vez; análise exclusiva de evidência fornecida, nenhuma ferramenta, escrita ou commit. Git determinístico do auditor: main...origin/main limpo; não descreve o Git histórico do alvo. Aceite **parcial**, com correções de precisão semântica; não há falha de transporte/infraestrutura comprovada.

| ID | Entrega comprovada e limite |
| --- | --- |
| b9790e31 | patch/verify exit0, eventos 3/6; TRACE_LINE25_VALIDATED_1_SYNC_9_PENDING_OTHERS_PRESERVED. Aceite da sentença25, sem concluir rastreabilidade global ou FT. |
| 15e0efc2 | patch/verify exit0, eventos 3/6; TRACE_EXECUTOR_VALIDATED_8_SYNC_2_PENDING_OTHERS_PRESERVED. Aceite das sete entradas delimitadas, preservando as demais. |
| 7a4bfd71 | patch/verify exit0, eventos 3/6; TRACE_RESILIENCE_VALIDATED_10_SYNC_0_PENDING_OTHERS_PRESERVED. Dez entradas desse RCF sincronizadas; não equivale a gate global aprovado. |
| 80d75353 | Parecer sobre evidência fornecida, sem inspeção própria. Listagem dos scripts e ausência de demonstração de seus contratos completos são compatíveis; a contradição apontada pelo auditor **não existe**. O resultado original chamou IDs de jobs 56c15176/7a4bfd71 de commits e acrescentou agentsGovernance.managedScripts sem prova no pacote: essas extrapolações são rejeitadas. Commit explicitamente fornecido: 1e19f7dc0c. |
| c5cc6492 | audit/verify aprovados, eventos 3/6; step3 no evento8 registra missing_paths=[] e no_net_git_change=true. O erro textual de 40 ciclos era diagnóstico incorreto da saída da sequência finita; não houve exploração agentiva não segmentada nesse job. Causa corrigida, testada e instalada em D4S, sem repetir o job. |
| 50968baf | patch/verify exit0, eventos 3/6; FT104_EXACT_IGNORE_EXCEPTION_ADDED e AUDIT_VISIBLE_OTHER_FILES_IGNORED. Unidade preserva auditoria existente e corrige visibilidade Git; não prometia recriá-la. Recibo comprova a validação delimitada de visibilidade, não commit/push ou autoria integral do documento. |

Headers dev...origin/dev ahead1/2/3/4 pertencem aos respectivos estados históricos. Não demonstram por si sós autoria, commit desse job ou push; ausência desses dados neste recorte também não prova ausência global de versionamento. A seção NEEDS_SUPERVISOR do auditor não muda os estados/error_kind dos seis jobs nem comprova nova falta de permissão. A causa D4S já resolvida não fica aberta por repetição do erro textual antigo.

Limitação observada em três segmentos: inferência local ainda extrapola fatos explícitos e relações semânticas, mesmo com contagens prontas e instruções restritas. Não reexecutar esses segmentos para obter texto aparentemente melhor. Próxima melhoria delimitada: extrair mecanicamente os campos verificáveis, com proveniência e limites de aceite explícitos; reservar inferência para uma comparação realmente necessária por unidade, seguida da revisão proporcional. Relatório gerado mecanicamente não pode declarar aceite semântico/global por contagem ou status.
