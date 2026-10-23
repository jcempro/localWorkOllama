# R8V — validação

## Unidade1: validador puro

Fonte TypeScript `localworker/response-contract.mts`, artefato JS gerado e espelhos positivos. Reutiliza Zod v4 já instalado (`fromJSONSchema`), sem nova dependência ou busca de schema remoto. Valida subconjunto limitado antes de compilação; JSON/schema, contagem de unidades por whitespace e substring contínua na fonte JSON apontada são gates formais. Não verifica verdade semântica nem atribui notas.

`node localworker/test-response-contract.mjs` passou: caso positivo, JSON cercado/inválido, enum/chave extra/ausência obrigatória, excesso de palavras, citações de outro campo/parafraseadas/vazias, fonte não string, pointer ausente/escape/índice inválidos, duplicação, tipos de tarefa incompatíveis com modo estruturado, schema remoto/regex/amplitude/profundidade/strings sem limite recusados, lookup herdado bloqueado e pointer escapado correto. Contrato ausente retorna null, sem alterar legado. Nenhuma inferência, chamada de rede, escrita em negócio ou resultado histórico reexecutado.

Integração de endpoint/gate/Ollama/instalação e teste real permanecem pendentes. Não declarar contrato operacional apenas porque o módulo puro passou.
