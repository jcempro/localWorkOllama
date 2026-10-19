# A3F — modo factual do renderizador

Aceite em19/10/2026 após resultado único de4988362b: suites validador/extrator/CLI com exit0. 77407022 anterior preservado: aplicou ramo e passou sintaxe, mas detectou incompatibilidade com marcador do coletor; não foi reiniciado. Extensão estrita corrigiu causa sem editar capturas ou reduzir testes.

O renderizador existente aceita:

```powershell
node --experimental-strip-types .\constructor\render-audit.mjs --facts <captura-atual.json> <captura-base.json>
```

Substituir os parâmetros por arquivos JSON UTF-8 de capturas produzidas pelo coletor, com envelope jobs. Saída: JSON em stdout, sem escrita de relatórios. Modo padrão e suas guardas semânticas permanecem inalterados. Não são novos parâmetros de instalação ou do Worker.

Teste aprovado: argumentos/JSON/duplicados inválidos, fixture com sentinela privada, determinismo, capturas históricas264 atuais/197 anteriores/67 novos, hashes exatos das fontes, código legado fora da inserção e hashes dos relatórios/manifesto preservados. Capturas privadas usadas são as retidas em15/10 e12/10; contagens não representam um inventário atualizado em19/10. Teste CLI depende dessas capturas para reproduzir a parte histórica, além de fixtures exclusivas que cria/limpa em audit-private com fronteira conferida; não cria outro Git nem servidor.

Revisão confirmou ramo anterior ao parse/efeitos legados, importação dinâmica do extrator aceito, argc exato e projeção positiva. Fonte SHA256 f66852fa20fbdc6e4a881455f3668bb12b3971b6178d39b715efa0e559360b7d e teste/dependências conferidos. Provas privadas facts-cli-sequence-proof.json/log-marker-sequence-proof.json. Nenhum teste foi repetido pelo supervisor. Runtime não fez commits; supervisor versiona CLI+teste separadamente da variante já aceita.

Todos os registros projetados continuam NOT_ASSESSED. Esta unidade facilita a auditoria, sem aceitar tarefas pelo status, repetir negócio histórico ou expor conteúdo privado.
