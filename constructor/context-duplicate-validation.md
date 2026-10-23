# C7M/D2C — validação de cópias literais

Plano e avaliação: `context-duplicate-plan.md`, C=8/exclusivo do supervisor. O Worker executou somente o ensaio sintético anterior; não implementou a guarda. O resultado foi consultado uma vez, com hash conferido. Não houve replay de `8e440f03` nem análise de negócio.

## Correção e preservação

O gerenciador distingue retornos Markdown de leitura pela mesma identificação já usada para preservá-los. Somente igualdade integral de `role=tool`, `tool_name=read_file` e conteúdo permite manter uma cópia literal ativa em vez de várias. Todas as ocorrências/ordem continuam no checkpoint original. Não deduplica mensagens humanas, decisões, comandos ou documentos diferentes; o lote pendente continua byteidêntico. Uma diferença de byte/path impede a deduplicação.

Uma `WeakMap` interna conserva a proveniência mínima das partes preservadas nas mensagens de checkpoint criadas por esta instância. Isso permite a mesma proteção em compactações seguintes, sem confiar em campos fornecidos pelo modelo, buscar substrings em resumos legados ou reter saídas descartáveis/raciocínio privado. Resumos antigos sem proveniência mantêm o comportamento conservador. O histórico ativo só muda após persistência, releitura, hash e rename válidos.

Schema v1 permanece compatível; ganhou `markdown_duplicates_deduplicated` opcional no checkpoint/evento. Índice e resumo mostram `D2C` e cada entrada recuperável; a UI existente exibe o resumo do evento. Sem nova configuração, dependência, janela, reserva, prazo ou mudança de modelo/esforço.

## Testes executados

- `node localworker/test-context-duplicates.mjs`: nove verificações passaram, incluindo cópias arquivadas, cópia no lote pendente, um byte/path diferente, mensagens humanas/decisões, falha de checkpoint, resumo legado, recall integral por páginas, recusa de compactação sem economia e compactação seguinte com proveniência. No fixture, a estimativa passou de 48.560 para 16.837 tokens após as etapas verificadas; não é medição de tokens do modelo nem benchmark de RAM/latência.
- `node localworker/test-context-manager.mjs`: passou, preservando as guardas existentes, checkpoint/hash, normas/objetivo/decisões, redução adaptativa, retornos ainda não vistos e rascunho recusado.
- `TEST_REPO_PATH` apontou exclusivamente ao alvo autorizado em `node localworker/test-context-overflow.mjs`: quatro cenários passaram com runtime real e Ollama simulado. Recuperação no mesmo job; base irredutível falha sem retry cego; rascunho recusado recuperável; leitura Markdown repetida com uma cópia literal ativa, ocorrência exata no checkpoint, evento D2C e leitura obrigatória comprovada. Nenhum callback a chat real.
- Mesmo alvo em `node localworker/test-context-runtime.mjs`: passou; quatro requisições, reidratação exata, decisão preservada e exposição de compactação no monitor. Testes leram o alvo e escreveram apenas fixtures de jobs; alterações herdadas do Git não foram atribuídas a eles.
- `node scripts/sync-src.mjs --write` e `--check`: 44 artefatos consistentes; `git diff --check` passou. Fonte e espelho possuem SHA256 `addcc0cf78334908092424403b930782430a2e411fafd79ae64ff3cd43433f6d`. RCF/README alterados somente pela projeção automática; `howto.md` explica o comportamento sem paths privados.

As execuções iniciais das suítes unitárias sob sandbox falharam; as mesmas suítes passaram com permissão específica aos temporários do Windows, sem alteração entre essas tentativas. A primeira extensão da suíte de runtime alcançou o cenário D2C e falhou no leitor do teste, que desconsiderava o timestamp prefixado do log; o leitor foi corrigido e a suíte passou integralmente. Todas as suítes afetadas foram executadas novamente após a preservação de proveniência.

## Instalação e limites

Instalação ainda pendente nesta unidade. Atualizar pelo instalador existente, conferir Worker e cópias de recuperação/manifestos e preservar configurações, controles de autorização e ausência de triggers de boot/logon. Não abrir Desktop, rearmar conversas ou enviar mensagens durante instalação.

D2C elimina redundância literal comprovada. Documentos únicos, instruções, decisões e bases irredutíveis permanecem protegidos; sua continuidade pode exigir segmentação. O ensaio não comprova que o prompt histórico caberia após esta correção, não altera seus resultados e não promete ausência de toda falha contextual futura.
