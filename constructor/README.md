# Auditoria interna do construtor

Estes arquivos apoiam a manutenção deste produto; não são necessários ao Worker instalado e não integram `src/`.

- [Causas, correções, validações e limites](audit-causes.md).
- [Avaliação individual de todos os jobs não cancelados](audit-report.md).
- [Manifesto sem conteúdo privado](audit-manifest.json): arquivos relativos, tamanhos e SHA-256 para confrontar a captura.
- `audit-jobs.mjs`: coletor de leitura, recebe diretórios `jobs` por argumento e `--output=<pasta>` opcional. Exclui `CANCELLED` antes de ler seus demais artefatos; não segue links.
- `audit-assessments.mjs`: avaliações explícitas por prefixo de ID, resolvido sem ambiguidade.
- `render-audit.mjs`: recebe caminho do inventário; recusa estados inválidos, avaliação ausente ou duplicada e fixtures divergentes do contrato.

## Uso

1. Defina os diretórios reais da instalação e de eventuais fixtures do construtor; não presuma perfil ou unidade.
2. Execute `node constructor/audit-jobs.mjs <jobs-instalados> <jobs-fixtures> --output=constructor/audit-private/final`.
3. Revise os novos jobs e acrescente avaliações verificadas; não use o status como prova de entrega.
4. Execute `node constructor/render-audit.mjs constructor/audit-private/final/inventory.json`.
5. Confira cobertura e ausência de dados privados no relatório e manifesto antes de versionar.

`audit-private/` contém pedidos, resultados e logs brutos e é ignorado pelo Git. Não o adicione ao commit. A captura final desta revisão inclui o teste real adicional; a captura inicial está preservada localmente para comparação. Uma captura é datada, não um monitor contínuo. O coletor não cancela, reinicia, remove nem altera jobs.
