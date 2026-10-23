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

## Aceite ainda pendente

Conferir os recibos, hashes, diagnósticos e contagens antes de reutilizar revisões existentes e segmentar lacunas reais. Não publicar artefatos privados, inferir sucesso por `COMPLETED` ou repetir tarefas de negócio. Falhas de chamada, callbacks e causas temporárias exigem correlação factual antes de qualquer correção funcional.
