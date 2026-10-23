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

## Unidade4: migração de revisão legada

Recebimentos anteriores a Q8S não têm token. A rota explícita `local_review.legacy_received` valida hashes UTF-8/status/error_kind/origem declarados contra artefatos, exige revisão0/registro ausente e grava recibo+nota em uma única operação sob lock. Não chama local_result novamente, não repete análise e não cria nota pelo status. Retry idêntico confirma a primeira importação; alteração ou revisão existente recusa. Não comprova exame cognitivo do declarante nem isola adversário com o mesmo usuário.

Suíte completa passou com MCP real stdio/SQLite isolado: importação de falha, divergência de resultado/status/error_kind, origem vazia sem arquivo parcial, retry idêntico e recusa de sobrescrita. Fixtures não são avaliações reais. Instrução global/howto/README/RCF refletem o contrato. Pendem instalação, migração real de revisão suficiente e auditoria restante.

## Projeção econômica do inventário

Inventário transporta somente nota/motivo atuais, estado e contagem de revisões. O histórico completo permanece no detalhe, evitando multiplicá-lo por50–100 linhas a cada atualização. Teste garante ausência de `history` na listagem e presença das revisões no detalhe; renderização testa a projeção correta de cada superfície. O limite de registro e a consulta futura continuam preservados.

## Instalação e avaliação reais

Instalador oficial atualizou Worker e duas recuperações; verificador interno passou a conferir também módulo Q8S, servidor, monitor/página, ponte, norma Worker e controles. Prova inicial privada `audit-private/quality-install-33e5c622-9c06-46e6-af44-42bd2ea7c21d/installed-proof.json`, SHA256 `128b6644a460596c31784ac85fcc6e4d47e508112ca9b6b08451471f8b010e1b`,2026-10-23T17:08:39.4718074Z. Manifestos/hashes conferidos, configuração do Worker/Codex preservada; chat desta manutenção ACTIVE/EXPLICIT_RESUME e outro alvo PAUSED/EXPLICIT_PAUSE preservados. Sem gatilho de boot/logon, wake/catchup, mensagem real, inferência ou retomada durante instalação. Ajuste final econômico do inventário exige sincronização final, em curso neste checkpoint.

GlobalRulesOnly instalou a norma Q8S no CODEX_HOME efetivo; hash do conteúdo externo ao bloco gerenciado permaneceu idêntico. Sem trocar modelo/esforço ou rearmar conversa.

Retorno real `5df5c7cd-315a-4d91-8854-9df479049643`, anteriormente recebido uma única vez e revisado em `evidence-provenance-validation.md`, importado pela ponte MCP instalada como **7/10**, revisão1. Motivo: quatro fatos/proveniência corretos, mas JSON cercado por Markdown contrariamente ao formato requerido; sem repetição histórica/aceite inventado. Hashes calculados do recebimento preservado, comparados pela API antes da gravação. Prova privada `audit-private/q8s-e9p-real-review-proof.json`; não é nota sintética nem avaliação dos142 casos. HTTP real do monitor atualizado confirmou7/10 na listagem e no detalhe, sem credencial na projeção.

Inspeção visual não comprovada: inicialização da ferramenta de navegador CUA falhou com `failed to write kernel assets`, caminho ausente. Não foi aberta/rearmada outra conversa nem contornado esse transporte. Testes reais HTTP e DOM das funções da página permanecem comprovados; não alegar screenshot/revisão visual inexistente. Cobertura histórica integral continua pendente.

### Sincronização final e recuperação da etapa pendente

A segunda rodada ficou bloqueada no orquestrador interno hospedado em PowerShell7 depois da primeira recuperação, sem filho instalador ativo. A hipótese de indisponibilidade do Agendador não se confirmou: consulta isolada em Windows PowerShell5.1 passou (CIM3651ms; COM1069ms). Não usar os campos nulos dessa primeira projeção XML COM como prova de configuração. Causa interna exata do bloqueio não comprovada; não atribuí-lo ao Worker/Ollama ou declarar correção universal de um defeito não localizado.

Confronto independente mostrou apenas `monitor.mjs` desatualizado na segunda recuperação. Antes de encerrar exclusivamente o orquestrador próprio, conferidos PID, executável, linha vinculada à instalação, início e ausência de filhos além do console. Nenhum Worker, app, chat ou serviço foi encerrado. Verificador ganhou seleção explícita `SupervisorThreadIds` validada contra instalações descobertas, permitindo recuperação restrita sem reinstalar unidades concluídas. Windows PowerShell5.1 executou somente a etapa pendente; depois VerifyOnly verificou todas as instalações, configurações, manifestos e controles.

Prova final `audit-private/quality-install-33e5c622-9c06-46e6-af44-42bd2ea7c21d/verified-final.json`, SHA256 `526c5a6a34b1446573eeee525f1ca5fa387d6dfd6187c9dbc39509f0487c29d4`,2026-10-23T17:24:16.8830406Z. Ambas as recuperações e Worker conferem com a fonte final; ACTIVE/EXPLICIT_RESUME e PAUSED/EXPLICIT_PAUSE preservados, sem boot/logon/wake/catchup ou retomada. Instalação humana geral já usa o PowerShell incluído no Windows; este helper é exclusivo do construtor, não novo componente do destino. `q8s-final-http-proof.json` registra a conferência HTTP final:7/10, revisão1, histórico somente no detalhe, sem token exposto.
