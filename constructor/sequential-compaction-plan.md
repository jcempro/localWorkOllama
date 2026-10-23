# FT-SUPERVISOR-SEQUENCE-S2Q — compactação e continuação

Solicitação humana de23/10/2026 neste chat: duas operações independentes no mesmo destino, primeiro `/compactar`, aproximadamente1s depois o prompt efetivo integral, sem esperar conclusão se a fila nativa impedir execução antecipada. Preservar identidade, ordem, unicidade, conteúdo, contexto, retentativas seguras, intenção e todos os comportamentos legítimos existentes. Validar prompts simples/completos, compactação demorada, fila, falhas e retries. Aceite integral depende de comprovação real; simulação não basta. Anexo é exemplo visual, não nova autorização para executar o job nele citado.

Supervisor fixa C8/exclusivo: compactação e despacho afetam contexto vivo, autorização, ordem e duplicidade globalmente; não delegar implementação, classificação ou validação desta fronteira ao Worker. R8V/Q8S/auditoria anterior permanecem; não repetir negócios nem CANCELLED. Novo contrato complementa N7C sem confundir compactação antes de encerrar uma delegação com compactação antes de retomar.

## Estado e rota de investigação

- Fonte oficial consultada: https://developers.openai.com/blog/mastering-codex-remote-for-engineering — Queue aguarda resposta corrente, Steer injeta orientação; `/compact` existe. Não estabelece contrato de `codex queue --message /compactar` nem atomicidade da dupla.
- Runtime existente: delivery.mjs envia callback completo por `codex queue`, protegido por continuidade/locks; supervisor/run.mts envia `continue` por mesma CLI e correlaciona recibos. Preservar ambos até alternativa comprovada.
- CLI instalado expõe queue `--message` textual, sem opção de comando nativo. Proxy oficial tentado uma vez, somente initialize: exit1, socket não conectado, os error10050. Nenhuma inferência ou mudança de histórico por esse teste. Catálogo atual sem ferramenta de compactação.
- Fonte do Desktop26.1016.8622 inspecionada somente leitura: compactThread usa thread/compact/start e exige owner, ou encaminha ao owner. Prova de implementação, não de acesso desta integração ao dono vivo. Recortes/hashes privados, não redistribuir código de terceiro.
- A skill Computer Use atual proíbe automatizar UI do ChatGPT Desktop; não contornar por outras bibliotecas. Não abrir/rearmar app, editar SQLite/rollout ou compactar cópia em app-server separado.

## Próximo experimento delimitado

A solicitação atual autoriza experimentar o texto exato `/compactar` pelo mecanismo de mensagem disponível no mesmo chat. Antes de habilitar produção, conferir se o cliente realmente o trata como comando nativo, e não como prompt comum. Sem confirmação de despacho nativo, preservar impedimento e não repetir o envio, nem alegar compactação. Se a ferramenta recusar a própria conversa, essa capacidade não está disponível por ela. Não criar chat paralelo sem solicitação humana. Somente se primeira etapa for realmente suportada, testar fila com prompt controlado específico e depois variantes; não inferir capacidade por timeout, eco, recibo de fila ou texto de modelo.

Persistir cada recibo/etapa antes de avançar. Envio aceito ou incerto não recebe retry automático; cancelamento/fechamento/boot não autoriza nenhuma etapa. Não alterar modelo/esforço ou reduzir guardas. Sem rota nativa comprovada, não implementar despachante fictício nem declarar aceite completo. Plano, resultado e limitações devem permanecer rastreáveis e howto coerente com cobertura efetiva.

Experimento realizado uma única vez: ferramenta aceitou destino, entregou input textual codex_delegation, sem confirmação nativa exposta. Sem segundo envio ou retry. Estado atual: norma distribuída e instalada, implementação/aceite operacional S2Q bloqueados por acesso nativo não comprovado; detalhes/prova em sequential-compaction-validation.md. Auditoria independente prossegue; nenhum requisito foi transformado em garantia fictícia.

Complementação humana e ensaio posterior da **fila CLI real**, independente do teste da ferramenta: duas mensagens aceitas, recebidas e correlacionadas no mesmo destino, prompt integral preservado, ordem confirmada. Intervalo observado4181ms, não1s comprovado. Comando virou turno comum de inferência; zero evento nativo observado nos turnos pertinentes. Não repetir o par. Causa e limites em sequential-compaction-validation.md; implementação/aceite S2Q permanecem pendentes da rota nativa do cliente. Nenhum callback de produção foi alterado ou recurso desativado. A auditoria histórica independente deve prosseguir com a unidade L1 já corrigida, sem reiniciar ec1f4139.
