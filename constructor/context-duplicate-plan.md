# C7M/D2C — cópias literais de evidência Markdown

## Evidência e escopo

O recibo `7a2b7843` foi consultado uma vez. O ensaio sintético passou, com SHA256 de `probe.json` `db312008134951f20ca8c1da7ee30d140565b00280448bbbb1247267ef040f75`. Na política atual, três retornos Markdown byteidênticos mantiveram a estimativa em 27.538 tokens, sem compactação. Texto comum distinto passou de 27.544 para 879 tokens; instruções explícitas e checkpoints foram preservados. Isso demonstra o mecanismo atual, não reconstrói o prompt/versão histórica de `8e440f03` nem demonstra OOM. O Git determinístico de 23/10 às 09:33:20 UTC estava `main...origin/main` limpo, coerente com diagnóstico privado ignorado.

A lacuna é a multiplicação ativa de cópias literais de um mesmo retorno Markdown. A proteção de documentos distintos é legítima e permanece. O RCF exige conteúdo literal preservado e histórico exato recuperável; não exige repetir bytes idênticos no prompt. Não há alteração normativa, redução da proteção documental nem autorização para resumir requisitos.

## Implementação autorizada no pedido vigente

C=8, exclusivamente supervisor: esta lógica pode afetar continuidade, instruções e operações futuras. Nenhuma etapa de risco, alteração da guarda ou instalação é delegada ao Worker. Escopo mínimo: `context-manager`, testes pertinentes, espelho generalista, documentação e instalação existente. Não executar negócio, repetir job histórico, aumentar janela, reduzir reservas ou alterar modelo/esforço.

Ao formar um checkpoint, deduplicar somente retornos `role=tool`, `tool_name=read_file`, já reconhecidos como documento Markdown pela política vigente, com conteúdo completo exatamente igual. Manter uma cópia literal no estado ativo: entre as mensagens retidas ou no texto preservado. Não normalizar espaços, linhas, Unicode, paths ou instruções. Mudança de um byte impede deduplicação. Mensagens humanas, decisões, comandos, documentos diferentes e lote ainda não visto continuam protegidos. Não decompor resumos legados para buscar duplicatas sem proveniência.

Todas as ocorrências e sua ordem permanecem integrais no checkpoint, verificado antes da alteração do histórico ativo. Índice aponta cada entrada; evento e resumo informam a quantidade de cópias redundantes suprimidas. Falha de persistência não altera o histórico. Ausência de economia suficiente mantém o comportamento existente de preservar e segmentar.

## Aceite bloqueante

Testar cópias entre entradas arquivadas e entre arquivo antigo/lote retido; documento com um byte diferente; normas e decisões repetidas; checkpoint integral/recall; falha de persistência; compactações seguintes; casos sem duplicação e suítes de contexto existentes. Validar fluxo real do runtime com Ollama simulado e alvo de testes autorizado, sem mensagem ao supervisor nem implementação de negócio. Conferir espelhos e instalar pelo mecanismo existente com preservação de estado, backups e sem rearmar chat/abrir aplicativo. Cada unidade funcional concluída recebe commit e push próprios.

Após a correção, repetir somente o ensaio sintético materialmente alterado, nunca o job histórico. Ainda pode haver base documental única irredutível: nesse caso, segmentação com evidências preservadas continua necessária; não declarar que toda falha de capacidade foi eliminada.
