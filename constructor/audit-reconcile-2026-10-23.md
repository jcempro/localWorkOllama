# Reconciliação da auditoria — 23/10/2026

## Estado comprovado

A captura de 15/10 contém 264 jobs não cancelados. Seus 67 registros incrementais foram revisados em `audit-review-2026-10-15.md`, com correções e limitações explícitas. A comparação dos IDs encontrou 67 linhas, sem ausência, duplicação ou registro extra. Isso não significa que todos os trabalhos históricos tenham sido concluídos.

A descoberta posterior encontrou 452 jobs não cancelados e um `CANCELLED`, excluído. Nenhum estado dos 264 registros anteriores mudou. Há 188 IDs novos: 142 `COMPLETED` e 46 `FAILED`; 139 pertencem ao blog, 48 a esta integração e um a outro repositório. São leituras de artefatos históricos, sem executar testes ou tarefas nesses repositórios.

A descoberta leu apenas metadados. Uma menção em relatório não comprova revisão nem aceite. Manifesto privado: `audit-private/2026-10-23-discovery-9004a840-a12a-415c-bcba-dadb674ba46e/manifest.json`, SHA256 `189f2381c6e00301de60a5ca467f39d230b198fffe5b1df78db75bca4543ab1a`.

## Próxima unidade: captura e fatos, sem inferência

Reutilizar `audit-jobs.mjs`, `extractAuditFactsA3F` e `audit-interactions.mts`, já existentes e conferidos. A sequência fará:

1. uma nova captura privada dos artefatos retidos, preservando as anteriores;
2. projeção factual validada contra a captura de 15/10;
3. correlação com chamadas e mensagens públicas do histórico local, por SQLite somente leitura.

O resultado será um conjunto de evidências, não um veredito semântico. `NOT_ASSESSED`, chamadas falhas de resultado, resultados efetivamente obtidos, fila e resposta do supervisor continuam distintos. Achados históricos não comprovam defeito atual.

O supervisor fixou C=5/júnior para essa coleta determinística. Não há inferência, execução de negócio, alteração de jobs/chats, instalação, retomada ou avaliação de risco pelo Worker. Só há escrita no diretório privado exclusivo da captura, associado ao pedido e ao `job_id` no handoff. Ele permanece ignorado pelo Git. Fontes são verificadas por hash antes de executar; saídas preexistentes são recusadas, e a sequência para no primeiro erro, preservando os efeitos.

Os limites pontuais dos comandos protegem contra espera de filesystem/SQLite indefinida; não mudam prazo, modelo, contexto ou esforço do Worker/Ollama. A captura não é atomicamente global: seu próprio coletor poderá aparecer `RUNNING`, a conferir pelo recibo final, sem criar auditoria recursiva.

## Handoff da coleta

Job `ead75a90-3670-469f-b8fb-0408d29d086b`, iniciado com recibo `RUNNING`. Sequência: `capture`, `facts`, `interactions`. Identificador exclusivo da captura: `4e5d0fe9-72fd-4b84-9ffb-0402cf381c83`; saídas em `audit-private/2026-10-23-capture-4e5d0fe9-72fd-4b84-9ffb-0402cf381c83/`. O próprio coletor pode constar da nova captura, sem que isso autorize auditoria recursiva.

## Aceite ainda pendente

Conferir os recibos, hashes, diagnósticos e contagens antes de reutilizar revisões existentes e segmentar lacunas reais. Não publicar artefatos privados, inferir sucesso por `COMPLETED` ou repetir tarefas de negócio. Falhas de chamada, callbacks e causas temporárias exigem correlação factual antes de qualquer correção funcional.

## Recibo da coleta — conferido

Resultado de `ead75a90-3670-469f-b8fb-0408d29d086b` consultado uma vez. `capture`, `facts` e `interactions` passaram com exit0, sem inferência. A captura contém 453 jobs não cancelados e exclui um `CANCELLED`. São 189 registros além da base de 264: os 188 descobertos anteriormente e o próprio coletor. O único `RUNNING` da captura é esse coletor; o recibo posterior confirma sua conclusão. Não é evidência de job órfão.

Arquivos privados conferidos por hash:

| Arquivo | SHA256 |
| --- | --- |
| inventory.json | abd15bcf53429632b07c6d59158fa9bcc614c216378a29411a026256221fe676 |
| facts.json | 9bf619890e8d01a9c398cf868d4a91b862b90729afc7ff0d3c737977be4c130c |
| interactions.json | 82e2053f886f70114b87280cff22f1517860f9f9e972c5024c0d33613ee86982 |

O hash da base permanece `37daad80df90ccc04669f35a56fcd6ad70fdd6368a9b97315121c0bf44fad3f9`. As 189 linhas da projeção continuam `NOT_ASSESSED`. O Git determinístico do coletor em 23/10 às 08:55:52 UTC registra `main...origin/main` limpo; não descreve autoria, push ou limpeza dos repositórios históricos. Nenhum commit pelo Worker era exigido: as saídas privadas são ignoradas, e o registro desta unidade pertence ao supervisor.

## Correlação: candidatos, não vereditos

Foram correlacionados 453 jobs e 63 conversas, com 19 chamadas iniciais falhas. Os diagnósticos dessas chamadas incluem argumentos inválidos, transporte legado e bloqueio da revisão por quota; ainda exigem comparação com correções já documentadas.

| Candidato | Base anterior | Registros novos |
| --- | ---: | ---: |
| Mais de uma leitura terminal de resultado | 17 | 1 |
| Callback com `usageLimitExceeded` | 11 | 5 |
| Evidência de callback não encontrada | 102 | 0 |

O caso novo de leitura repetida é `bd98a7c5-1785-46c9-8267-0048dd9ade26`: duas chamadas e dois resultados terminais, com um candidato a callback. Isso não demonstra a causa ou ilegitimidade da segunda consulta. Os cinco callbacks de quota e o único `WORKER_INFRA_ERROR` novo também são históricos: este último é `6a4534fd`, com perda do runner em 16/10 e alterações parciais preservadas, já mencionado na cadeia de recuperação A3F. Não atribuir a causa física a RAM/Ollama sem prova nem repetir o job.

Próxima unidade delimitada: relacionar os 189 registros às referências literais e provas públicas existentes, sem convertê-las automaticamente em aceite; e coletar apenas os turnos públicos das duas leituras de `bd98a7c5`. Não consultar novamente seu `local_result`, enviar mensagens, rearmar monitores ou executar negócio. A captura atual é o corte desta reconciliação; o coletor seguinte será revisado pelo próprio recibo, sem iniciar uma cadeia recursiva de novas capturas.
