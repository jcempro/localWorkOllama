# Auditoria interna do construtor

Estes arquivos apoiam a manutenção deste produto; não são necessários ao Worker instalado e não integram `src/`.

- [Causas, correções, validações e limites](audit-causes.md).
- [Avaliação individual de todos os jobs não cancelados](audit-report.md).
- [Manifesto sem conteúdo privado](audit-manifest.json): arquivos relativos, tamanhos e SHA-256 para confrontar a captura.
- [Interações supervisor↔Worker por ID](audit-interactions-report.md): cobertura da captura de 11/10/2026, mensagens públicas/ferramentas, quota e recuperação.
- `audit-jobs.mjs`: coletor de leitura, recebe diretórios `jobs` por argumento e `--output=<pasta>` opcional. Exclui `CANCELLED` antes de ler seus demais artefatos; não segue links.
- `audit-assessments.mjs`: avaliações explícitas por prefixo de ID, resolvido sem ambiguidade.
- `render-audit.mjs`: recebe caminho do inventário; recusa estados inválidos, avaliação ausente ou duplicada e fixtures divergentes do contrato.
- `audit-interactions.mts`: recebe inventário, CODEX_HOME real e destino JSON privado; cruza somente tipos públicos userMessage/agentMessage/mcpToolCall, sem reasoning, por ID. Inclui todos os itens públicos dos turnos vinculados, inclusive finais sem ID. Distingue menção manual, candidato a callback e resposta final oficial. SQLite é read-only; não envia mensagens.
- `render-interactions.mts`: recebe inventário, JSON de interações e destino Markdown; verifica cobertura e gera tabela sem texto bruto.
- `audit-assessments-2026-10-11.mts`: avaliações explícitas adicionais, preservando as anteriores e os efeitos parciais.

## Uso

1. Defina os diretórios reais da instalação e de eventuais fixtures do construtor; não presuma perfil ou unidade.
2. Execute `node constructor/audit-jobs.mjs <jobs-instalados> <jobs-fixtures> --output=constructor/audit-private/final`.
3. Revise os novos jobs e acrescente avaliações verificadas; não use o status como prova de entrega.
4. Execute `node constructor/render-audit.mjs constructor/audit-private/final/inventory.json`.
5. Confira cobertura e ausência de dados privados no relatório e manifesto antes de versionar.
6. Com Node.js 22.21+ e permissão local de leitura do SQLite/WAL, execute `node constructor/audit-interactions.mts <inventário.json> <CODEX_HOME-real> <destino-privado.json>`. Os argumentos entre `<...>` devem ser substituídos por paths reais explicitamente escolhidos; o destino privado deve ficar em `constructor/audit-private/`.
7. Execute `node constructor/render-interactions.mts <inventário.json> <destino-privado.json> constructor/audit-interactions-report.md`. O gerador exige a mesma captura, cobertura sem IDs extras/ausentes e diagnóstico de callbacks operacionais sem evidência; não interpreta ausência de histórico como sucesso.

`audit-private/` contém pedidos, resultados e logs brutos e é ignorado pelo Git. Não o adicione ao commit. A captura final desta revisão inclui os testes reais adicionais de leitura e escrita; a captura inicial está preservada localmente para comparação. Uma captura é datada, não um monitor contínuo. O coletor não cancela, reinicia, remove nem altera jobs.

## Teste real instalado

O script existente `localworker/test-installed-contract.mjs` usa `TEST_REPO_PATH` e `TEST_WORKER_HOME`. Sem argumento testa leitura; com `--write` testa criação de fixture exclusivo e limpeza condicionada à identidade e conteúdo. É teste interno restrito ao repositório autorizado para esta manutenção. Persiste baseline, job, evidências e verificação final; não envia mensagens a outros chats. Abrir/fechar o monitor não altera o job. O arquivo temporário não representa implementação de FT e não é commitado no alvo; versiona-se a unidade de teste neste construtor.
