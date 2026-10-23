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

## Instalação real

Windows PowerShell5.1 executou os instaladores oficiais: Worker e duas recuperações conferem com fontes/artefatos/manifestos, incluindo core, política/hash e módulo R8V. Prova privada `audit-private/r8v-install-3ea52f4f-714e-48c4-aeff-667eb57e6603/installed-proof.json`, SHA256 `0577f05e8d58a4f9a1042b1fcf234ecbb0a694d9d507a2b057d35521a2fa6093`,2026-10-23T17:59:41.8636393Z. Configuração Worker/Codex e controles ACTIVE/EXPLICIT_RESUME deste chat e PAUSED/EXPLICIT_PAUSE do outro alvo preservados, sem boot/logon/wake/catchup, mensagens ou inferência/retomada durante a instalação.

GlobalRulesOnly instalou R8V preservando Q8S e o hash do conteúdo externo ao bloco gerenciado. Nenhuma troca de modelo/esforço/contexto ou relaxamento de recursos/permissões. A disponibilidade nativa do schema no modelo atual ainda exige o ensaio real seguinte; testes simulados não comprovam o decoder real.

Ensaio preparado em `audit-private/r8v-native-9f95912f-8ad0-4b06-a666-eb9549fcd750.json`,547 caracteres, SHA256 `330bf4a559a4fb64a18b40362e0baa678d360efa7159c017d109aa1ef8198ad9`. Três fatos já conferidos (501 unidades observadas,limite220,citação do diff_check histórico), sem nota/risco/reescrita/reexecução histórica. Contrato nativo de JSON≤70 unidades com citação vinculada; C5/júnior, escopo `566488c5bb7d81e15237051df64eccc085b3f0dfc2372951c8fdd3bdc6bfb42b`. Serve para validar alteração definitiva, não para alegar capacidade cognitiva geral. No callback, obter uma vez pela ponte atualizada, conferir corpo/fatos/recibo formal/Git e só depois atribuir Q8S real.

## Handoff do ensaio nativo

Job `ec68b9b2-af4e-4c05-a4e0-dc3779f8dbce`, recibo RUNNING com `response_contract_version:1`, criado uma única vez pela ponte instalada após conferir identidade/cwd desta conversa e o hash pela política instalada. Pedido preservado em `audit-private/r8v-native-request.json`; recibo/links privados em `r8v-native-running.json`. Não consultar antes do callback nem reexecutar6d395cf9 ou comandos históricos.

Critério de revisão: corpo JSON com observed_word_units501,declared_word_limit220 e validation_quote literal da string histórica; forma/citação aprovadas pelo gate, sem seções extras antes do rodapé. Essa checagem não aprova os históricos ou a FT inteira. Se falhar, usar diagnóstico/saídas preservadas para hipótese corretiva concreta, sem replay cego. Após receber uma vez via ponte atualizada e examinar, registrar Q8S com o recibo retornado; não pontuar antecipadamente.

Auditoria integral ainda pendente;16 casos específicos preservados, CANCELLED excluídos. Retorno6d recebeu2/10 e correções materiais registradas em `audit-review-2026-10-23.md`; não alegar que schema resolve interpretação universal. R8V publicado até92df5f8, fonte/src/howto/norma e instalação conferidos. N7C: catálogo desta sessão sem ferramenta nativa de compactação ou medição autoritativa barata de ocupação; handoff não é compactação. Informar impedimento após aviso com links, sem UI/SQLite/fila, troca de modelo ou interferência no job; encerrar sem polling.
