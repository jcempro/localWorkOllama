# S2Q — capacidade real e aceite pendente

23/10/2026, C8/exclusivo, sem Worker, alteração de preferências, abertura de UI ou replay de negócio. Plano: sequential-compaction-plan.md. Fonte: sequential-compaction-request.md.

## Verificações efetivas

1. Ferramentas expostas não incluem compactação. A documentação oficial distingue Queue de Steer e confirma `/compact`; não garante interpretação de slash commands por `codex queue` nem a dupla atômica. Fonte: https://developers.openai.com/blog/mastering-codex-remote-for-engineering.
2. CLI efetivamente descoberto: queue recebe `--message <TEXT>`, sem opção nativa de compactação. Proxy oficial, somente initialize, não conectou ao socket da instância viva: exit1/os error10050 em2026-10-23T18:40:47.511Z. Esse erro não comprova sua causa física; não foi contornado por outro app-server.
3. Código instalado do Desktop26.1016.8622: compactThread solicita thread/compact/start na instância owner ou encaminha ao owner. Prova de capacidade interna, não interface concedida à integração. Código de terceiro inspecionado read-only; recortes e hashes privados, não redistribuídos.
4. Experimento humano autorizado: uma chamada send_message_to_thread para o ID e diretório correntes confirmados, texto exato `/compactar`. Ferramenta respondeu apenas threadId, e o conteúdo chegou ao supervisor como mensagem textual codex_delegation com input `/compactar`. Não houve retorno nativo/evento de compactação exposto. Uma leitura de thread manteve o mesmo turno inProgress; não forneceu prova de compactação. Isso demonstra entrega textual neste caminho, não comando nativo comprovado.
5. Não repetir primeiro envio nem enviar segundo prompt como se a primeira etapa tivesse sido nativa. Ausência de prova não é prova universal de impossibilidade; é bloqueio desta integração/cliente. A skill Computer Use atual proíbe automatizar UI do ChatGPT Desktop; não houve contorno.

## Limite material

Não existe nesta sessão rota suportada acessível e comprovada para disparar compactação da instância viva. Portanto **não implementada/comprovada a automação S2Q**, nem os ensaios de1s, fila durante compactação demorada, prompt simples/completo, retry e concorrência. Recibo de envio ou resumo deste checkpoint não satisfaz o aceite. Não instalar despachante que envie slash como texto comum nem temporizador que presuma sucesso. N7C continua obrigatória, com impedimento explícito; callbacks existentes conservam prompt integral/guards e não recebem nova compactação fictícia.

Desbloqueio exige o cliente expor uma operação nativa da mesma instância e uma fila cuja relação com compactação seja verificável. Quando disponível: testar duas etapas persistidas e correlacionadas no mesmo destino, conteúdo/hash integral do prompt, intervalo observado, barreira contra execução antecipada, confirmação nativa e resposta real; falha parcial ou recibo incerto nunca recebe replay cego. Sem fila segura, fallback mínimo é preservar o prompt e enviá-lo depois da confirmação nativa, sem reduzi-lo a continue. Isso permanece requisito, não garantia de suporte atual.

Provas privadas: audit-private/sequential-compact-capability.json e sequential-compact-message-test.json. Auditoria histórica continua pendente; resultado ec1f4139 recebido/revisto uma vez, Q8S3/10 registrado, sem repetir inferência para nota.

## Distribuição efetivamente realizada

Norma S2Q adicionada à fonte global, RCF e howto, com limitação explícita; sincronização validou49 artefatos. Instalador oficial GlobalRulesOnly executado em Windows PowerShell5.1 em2026-10-23T18:49:03.820Z. Único bloco global igual à fonte; conteúdo externo preservado; hashes de config.toml e config.json do Worker inalterados. Prova privada sequential-compact-installed-proof.json, SHA256 `2fa8a30a994173193c8d4c27ce4c0a1232cfb9e6df5457d18a85366b5d74e530`. Reinjeção das instruções nesta conversa já contém S2Q. Isso comprova distribuição normativa, **não compactação automática nem aceite operacional**. Runtime/callbacks existentes não foram modificados por esta unidade.
