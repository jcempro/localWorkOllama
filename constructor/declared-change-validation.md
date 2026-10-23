# F7P — prova de mudança declarada

Plano/diagnóstico: `declared-change-plan.md`, C=8/exclusivo do supervisor. O relatório histórico `06e2c115` não foi regenerado, relido ou promovido a aceite bibliográfico. A falha persistida permanece histórica.

## Implementação

A impressão de estado operacional agora combina Git com SHA256 dos alvos explicitamente declarados quando há escrita obrigatória. Usa os mesmos paths confinados e hashing por stream existentes. A guarda de progresso e a contagem de mutações reconhecem alteração efetiva desses arquivos por comandos, mesmo que ignorados pelo Git. Sem alvos declarados, o mecanismo Git anterior permanece.

Conclusão exige efeito bem-sucedido e mudança em todos os alvos declarados. Essa prova pode satisfazer a alteração líquida sem variação Git; não dispensa autorização, leitura/comando obrigatório, validação, política de commit ou revisão semântica. Escrita idêntica, reversão, alvo inalterado/faltante, efeito só em outro arquivo e comando falho continuam recusados. Não adiciona arquivos ignorados ao Git, não muda `.gitignore` e não amplia permissão.

`completion_verified` expõe `declared_changes_verified`, `required_change_paths` e `git_unchanged`; este último é `null` quando a comparação Git não está disponível. O resumo diferencia mudança comprovada nos alvos de Git inalterado. Os hashes observam estado; não certificam autoria nem qualidade.

## Validação executada

- `test-declared-change-proof.mjs`: passou com 17 verificações agregadas. Sequências determinísticas criaram/alteraram relatórios em temporário comprovadamente ignorado; negativos de igualdade, leitura, reversão, alvo faltante, outro arquivo, lista parcialmente alterada, comando falho com efeito parcial preservado e efeito não declarado foram recusados. Um comando repetível com saída constante produziu cinco alterações de conteúdo: progresso observado em todas, sem bloqueio; seis requisições ao Ollama simulado, nenhuma inferência real. Fixtures próprias removidas após verificar conteúdo; Git igual ao estado inicial, sem editar regras de exclusão.
- `test-change-proof.mjs`: quatro cenários existentes passaram — leitura não é mutação, escrita idêntica recusada, outro arquivo não substitui obrigatório e conteúdo de arquivo não rastreado comprovado. Estado Git inicial restaurado.
- `test-execution-contract.mjs`: passou — leitura/comando obrigatório, ordem determinística, limite agentivo sem interferir na sequência, argv multiline, falha sem replay, recibos, não repetição de sucesso e propriedade de commits preservados.
- Todos os testes usaram exclusivamente o alvo de testes autorizado, com fixtures próprias; não executaram tarefas de negócio nem enviaram callback real.
- Espelhos/documentação: 44 artefatos consistentes, `git diff --check` passou. `worker-core.mjs` e `src/localworker/worker-core.mjs` têm SHA256 `8ee2f3fa9c297b4511f2e967d82124b1d19db8bc895a94a6c301210b6cb734a3`. RCF/README somente na projeção automática; `howto.md` explica o contrato.

## Instalação

Pendente nesta unidade: instalador existente, conferência de Worker e duas recuperações/manifestos, configurações e autorizações preservadas, sem abrir/rearmar chat. A instalação D2C já foi comprovada separadamente. Não usar mudança de metadados para declarar este passo concluído.
