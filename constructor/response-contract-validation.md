# R8V — validação

## Unidade1: validador puro

Fonte TypeScript `localworker/response-contract.mts`, artefato JS gerado e espelhos positivos. Reutiliza Zod v4 já instalado (`fromJSONSchema`), sem nova dependência ou busca de schema remoto. Valida subconjunto limitado antes de compilação; JSON/schema, contagem de unidades por whitespace e substring contínua na fonte JSON apontada são gates formais. Não verifica verdade semântica nem atribui notas.

`node localworker/test-response-contract.mjs` passou: caso positivo, JSON cercado/inválido, enum/chave extra/ausência obrigatória, excesso de palavras, citações de outro campo/parafraseadas/vazias, fonte não string, pointer ausente/escape/índice inválidos, duplicação, tipos de tarefa incompatíveis com modo estruturado, schema remoto/regex/amplitude/profundidade/strings sem limite recusados, lookup herdado bloqueado e pointer escapado correto. Contrato ausente retorna null, sem alterar legado. Nenhuma inferência, chamada de rede, escrita em negócio ou resultado histórico reexecutado.

Integração de endpoint/gate/Ollama/instalação e teste real permanecem pendentes. Não declarar contrato operacional apenas porque o módulo puro passou.

## Unidade2: integração e regressões

MCP valida antes de criação/monitor e persiste o contrato; recibo RUNNING agrega versão aceita. Hash SW-HYBRID inclui o campo só quando presente, sem alterar projeção legada. Runner revalida. Ollama recebe schema nativo/temperatura0 somente na rota explícita de evidência read-only sem ferramentas; ausência de contrato mantém temperatura/format/tools anteriores. O template textual padrão é substituído pelo contrato explícito, preservando normas, fronteira P2D e proveniência E9P.

Gate valida corpo antes de completion_verified; uma correção exclusivamente de saída, sem ferramentas/efeitos adicionais. Segunda recusa/ausência de ciclo ou sequência determinística preserva candidato público/hash/diagnóstico no job e encerra incompleto sem repetir comandos. Não remove cercas nem trunca JSON validado. Rodapés operacionais/Git permanecem fora do corpo validado; validação formal não constitui aceite semântico.

Testes puros passaram com hash opcional/alterado. Suíte Q8S completa com MCP real/SQLite isolado passou, incluindo rejeição R8V antes de qualquer job/monitor. `test-execution-contract.mjs` com Ollama simulado passou: schema/temperatura0/tools vazios, corpo JSON inalterado, recibo formal, correção única de cerca Markdown e duas citações inválidas bloqueadas/preservadas sem completion_verified. Também passaram os contratos anteriores: E9P/P2D, leituras/comandos obrigatórios, inspeção, sequência/argv multiline, falha sem replay, propriedade/recibos. Uma colisão lexical de variável no harness foi corrigida; não era falha do produto. Nenhuma inferência real ou alteração de negócio executada por esses testes.

Instaladores/update/recuperações incluem o novo módulo, fonte/artefatos/documentação sincronizados. Instalação real e ensaio nativo permanecem próximos passos; não concluir a FT integral antes deles.

Teste adicional do gate passou: ferramenta inesperada na correção foi recusada antes de qualquer execução e seus nomes foram preservados no artefato público; sequência determinística com saída acima do limite terminou RESPONSE_CONTRACT após executar o comando uma vez, sem inferência/replay. A suíte completa foi reexecutada após consolidar o helper de persistência; execução anterior já em andamento foi coletada separadamente, sem usar seu resultado como validação de código posteriormente alterado.
