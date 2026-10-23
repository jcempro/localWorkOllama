# Q8S — evidências de implementação

## Unidade1: persistência e endpoint

Implementação C=8, exclusiva do supervisor. Fonte `localworker/supervisor-review.mts`, artefato gerado pelo sincronizador, manifesto positivo e instaladores/recuperações atualizados. `local_result` mantém os campos anteriores e agrega recibo para COMPLETED/FAILED; falha de emissão conserva o resultado e expõe indisponibilidade, sem nota falsa. `local_review` exige declaração explícita de recebimento/revisão, recibo vinculado ao conteúdo, credencial, identidade de conversa/diretório conferida no SQLite do Desktop e versão otimista. Processo identificado como Worker é recusado. Não há capacidade de comprovar tecnicamente exame cognitivo ou isolar adversário sob mesmo usuário do SO.

`node localworker/test-supervisor-review.mjs`: passou em Node22.21.0/Windows. Fixtures isoladas e removidas; **notas sintéticas de teste não são avaliações de jobs reais**. Exercitou ausência de nota inicial, emissão idempotente, rejeição antecipada/sem recibo, confirmação obrigatória, faixa/inteiro/justificativa, token incorreto, escrita concorrente idempotente, conflito, revisões, obsolescência por alteração do retorno, falha avaliada independentemente do status, distinção de sequência determinística, limites16/32, CANCELLED/ativos recusados, corrupção preservada, processo Worker recusado, concorrência com exclusão/retenção sem recriação e preservação de vizinho.

O mesmo teste iniciou o servidor MCP real em processo separado via stdio, usou SQLite isolado e chamou local_result/local_review/ponte, incluindo retry e identidade divergente. Não enviou mensagem ao Desktop, não acionou modelo, não executou negócio nem retomou job histórico. O teste inicial tinha expectativa textual de erro mais restrita que o diagnóstico correto de obsolescência; a asserção foi corrigida e a suíte inteira passou.

Pendências: projeção/UI atualizada ao vivo, norma global/callback, instalação real, confirmação de avaliação real, migração segura de revisões históricas suficientes e auditoria incremental restante. Não declarar a demanda integral concluída.

Retenção anterior: `TEST_REPO_PATH=<alvo autorizado> node localworker/test-history.mjs` passou, preservando ativos/entregas ambíguas/entradas inseguras e recuperação de lock/retirada interrompida. A primeira chamada omitiu o parâmetro obrigatório; depois a sandbox recusou rename no temporário com EPERM. A mesma suíte, com parâmetro e permissão adequados, passou sem mudança funcional ou alteração do repositório alvo. O harness agora copia também a dependência canônica de lock utilizada pela retenção.

## Unidade2: monitor e histórico

Projeção Q8S somente leitura no detalhe e inventário, inclusive linhas terminais em cache. Coluna Qualidade, painel compacto com motivo e histórico recolhível; atualizado pelo fluxo existente, sem reload ou nova inferência. NOT_ASSESSED/STALE/UNAVAILABLE não viram0 nem recebem cor de aprovação. Texto usa textContent, nunca HTML vindo do motivo. Credenciais não integram a projeção pública. Cache de até1000 projeções, invalidado por metadados dos artefatos relevantes, evita releitura/hash do retorno inalterado a cada atualização; não fornece garantia contra adulteração adversarial sob o mesmo usuário do SO.

Suíte `test-supervisor-review.mjs` passou novamente: mudança de nota após cache terminal aparece na consulta seguinte, revisão anterior permanece, mudança posterior de conteúdo torna nota obsoleta e snapshots não vazam token. Scripts inteiros da página compilam no VM; teste DOM das funções reais confirma nota/histórico, ausência/obsolescência/indisponibilidade e motivo contendo `<script>` mantido como texto literal. Não equivale a inspeção visual no browser nem a instalação; permanecem etapas distintas.

## Unidade3: integração do checkpoint

Norma global Q8S distribuída por `src/agents.supervisor.md`, preservando revisão proporcional, consulta única, economia, modelo/esforço e intenção humana. Callback requer registro após exame concluído e proíbe inventar nota/recibo ou repetir resultado. Norma Worker reserva atribuição ao supervisor sem reduzir autonomia técnica do microescopo. Regra local não é exportada. Monitor inclui o módulo de revisão e o store em sua identidade de fonte para a atualização oficial recarregar dependências alteradas, sem afetar inferência/job. Teste existente estendido para verificar o callback real e a norma Worker, além do fluxo MCP/UI.

O teste concorrente identificou que a varredura inicial da retenção ainda estava fora do lock: podia observar temporário atômico desaparecendo e omitir um job elegível nesta rodada. A leitura de elegibilidade/tamanho passou a usar o mesmo lock, além da retirada já protegida; isso evita a causa para revisões/controles concorrentes. O teste verifica também os erros da limpeza, sem aceitar apenas um Promise.allSettled. Não reinicia inferência nem reduz retenção/autorização.
