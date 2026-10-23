# Q8S — descoberta inicial

Inspeção seletiva da implementação real, sem avaliação antecipada:

- `localworker/server.mjs:local_result` reconcilia o job, lê estado/entrega e retorna `result.md` ou `error.txt`, além de `supervisor-final.md`. Não há confirmação persistida de recebimento/revisão/nota nessa rota. Não usar o campo de resultado do supervisor como se já fosse uma avaliação estruturada.
- `job-store.mjs` fornece diretório exclusivo por ID, escrita atômica, estado e retenção. `monitor.mjs` projeta snapshot/inventário; `monitor-page.mjs` e o fluxo de atualização existente são as superfícies a integrar. As interações com cache, SSE e exclusão precisam ser conferidas antes de alterar contratos.
- `maintenance_supervision`/`delegation-policy.mjs:assessment` são risco/criticidade; `worker-core:progressGuard` avalia progresso. **Nenhum deles é nota de qualidade**. Não reutilizar nomes/valores como se cumprissem a demanda.
- `delivery.mjs:queueMessage` já solicita recebimento único e revisão proporcional. A integração pode aproveitar esse checkpoint, sem nova chamada paga só para avaliar. `mcp-call.mjs` possui seleção explícita de ferramentas e exigirá atualização se houver nova ferramenta de registro.

Direção a especificar no RCF após conferir os mecanismos restantes: avaliação separada do estado técnico, vinculada ao retorno/evidência recebida e idempotente; somente supervisor atribui/confirma. Nota ausente permanece ausente. Escala inteira, justificativa dos extremos, revisão posterior rastreável, UI discreta e limpeza por job. Não há funcionalidade de nota implementada ou avaliações persistidas nesta descoberta. Requisitos integrais e exclusão confirmada dos CANCELLED permanecem em `supervisor-quality-request.md`/`supervisor-quality-plan.md`.
