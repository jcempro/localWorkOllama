# Auditoria incremental — captura de 15/10/2026

Base privada: `audit-private/2026-10-15-current/inventory.json`, SHA256 `37daad80df90ccc04669f35a56fcd6ad70fdd6368a9b97315121c0bf44fad3f9`. Captura: 264 jobs não cancelados; 67 posteriores à captura anterior. Este checkpoint revisa somente seis deles; não substitui o aceite dos outros 61.

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
