# localWorker no Codex Desktop (Windows 11 2025H2+)

## Objetivo e percurso

Este guia reproduz a instalação do `localWorker` em um Windows 11 2025H2 ou posterior **limpo**. O Worker usa Ollama para tarefas extensas em um repositório, persiste cada job e devolve o resultado ao **mesmo chat** do Codex Desktop. O supervisor decide e revisa; o usuário continua escolhendo o GPT e seu esforço de raciocínio normalmente.

```text
Pessoa ─► chat Codex Desktop ─► MCP localWorker ─► Ollama local
            ▲                       │                  │
            └───── codex queue ◄──── resultado persistido ◄┘
                    mesmo chat; revisão final
```

| Etapa | Resultado esperado |
| --- | --- |
| Instalar programas | Git, Node.js, npm, Codex e Ollama respondem. |
| Preparar o modelo | `qwen3-coder-next-32k` aparece no Ollama. |
| Instalar o MCP e instruções | `local_analyze` aparece no Desktop; tarefas adequadas usam o Worker sem pedido repetido. |
| Validar | O job conclui e o chat de origem retoma para `local_result` e revisão. |

Os caminhos neste artigo são calculados a partir da máquina. Um caminho como `C:\Exemplo\projeto` é **fictício**, nunca um local presumido. Execute os comandos em PowerShell como o usuário do Codex; aceite elevação somente quando o Windows a pedir para instalar aplicativos ou registrar uma tarefa. Tenha internet, autorização de instalação e espaço para um modelo Ollama de dezenas de GB. Não coloque tokens, senhas nem dados privados nos exemplos.

## 1. Instalar programas e obter a fonte

1. Abra PowerShell e teste `winget --version`. Se não existir, instale/atualize **App Installer** pela Microsoft Store e reabra o terminal; os instaladores oficiais também podem ser usados sem `winget`.
2. Instale [Git para Windows](https://git-scm.com/download/win), [Node.js 22 ou posterior, edição LTS](https://nodejs.org/en/download) com npm, [Ollama para Windows](https://ollama.com/download/windows) e [Codex Desktop para Windows](https://learn.chatgpt.com/docs/windows/windows-app). O Desktop também pode ser instalado por `winget install --id 9PLM9XGG6VKS -s msstore`. Abra o Desktop, entre na conta e crie/abra um projeto com o repositório de trabalho.
3. Instale o Codex CLI: `npm install -g @openai/codex`. A entrega exige `codex queue` com `--thread` e `--message`; confirme em `codex queue --help`. Atualize o Desktop/CLI se faltar essa função.
4. Obtenha uma cópia **integral** deste projeto, incluindo `src/install.ps1`, `src/localworker/` e o lockfile. Use `git clone https://github.com/jcempro/localWorkOllama.git <PASTA_ESCOLHIDA>` ou um pacote íntegro da mesma distribuição. O marcador é escolhido por você; nenhum caminho local é presumido.

Confirme cada instalação:

```powershell
git --version
node --version
npm --version
codex --version
codex queue --help
ollama --version
```

## 2. Preparar Ollama e o modelo

Abra Ollama. A API local deve responder; se não responder, inicie o aplicativo ou execute `ollama serve` em outro terminal. Antes do download, pode escolher outro volume para modelos com a variável de usuário `OLLAMA_MODELS` e reiniciar Ollama, conforme a [documentação Windows](https://docs.ollama.com/windows). A configuração atual usa o modelo base Q4 com janela de 32.768 tokens:

```powershell
Invoke-RestMethod 'http://127.0.0.1:11434/api/version'
ollama pull qwen3-coder-next:q4_K_M
$ModelFile = Join-Path $env:TEMP 'localworker-qwen32k.Modelfile'
[IO.File]::WriteAllText($ModelFile, "FROM qwen3-coder-next:q4_K_M`nPARAMETER num_ctx 32768`n", [Text.UTF8Encoding]::new($false))
ollama create qwen3-coder-next-32k -f $ModelFile
ollama list
```

`qwen3-coder-next-32k` deve aparecer na lista. Se faltar espaço, escolha um volume adequado e repita o download; preserve arquivos pessoais. Veja a sintaxe do [Modelfile](https://docs.ollama.com/modelfile).

## 3. Instalar o Worker como MCP

O instalador portável em `src/install.ps1` também instala os pré-requisitos da etapa 1, prepara o modelo da etapa 2, configura MCP/instruções globais e registra watchdog. As etapas 1 e 2 permitem inspecionar cada programa antes de executar a automação. Execute em PowerShell:

```powershell
$Source = (Resolve-Path -LiteralPath '<PASTA_ESCOLHIDA>').Path
& (Join-Path $Source 'src/install.ps1')
```

Na primeira execução, aceite os prompts de instalação e autentique o Codex Desktop na sua conta. Repita o mesmo comando após atualização da fonte: o instalador identifica instalação existente, atualiza com backups e preserva jobs em execução. Se `winget` faltar, o instalador tenta registrar o App Installer, instalar o pacote oficial assinado e abrir a Microsoft Store para concluir a instalação. A execução com `-SkipPrerequisites` pressupõe que os programas já estejam disponíveis e serve para ambientes de teste; `-SkipModel`, `-SkipWatchdog` e `-SkipGlobalRules` isolam verificações específicas. Todos os valores substituíveis constam em [src/README.md](src/README.md).

### Equivalente manual e configuração gerada

Para inspecionar ou reproduzir cada passo sem o orquestrador, substitua `<PASTA_REAL_DO_PROJETO>` pelo caminho da fonte recebida. O destino e a base Codex derivam do perfil do usuário; se `CODEX_HOME` já existir, preserve esse valor. `npm ci` precisa de internet numa máquina limpa.

```powershell
$Source = (Resolve-Path -LiteralPath '<PASTA_REAL_DO_PROJETO>').Path
$WorkerHome = Join-Path $env:USERPROFILE '.codex-local-worker'
$CodexHome = if ($env:CODEX_HOME) { $env:CODEX_HOME } else { Join-Path $env:USERPROFILE '.codex' }
$CodexConfig = Join-Path $CodexHome 'config.toml'
$NodeExe = (Get-Command node.exe -ErrorAction Stop).Source
$NpmExe = (Get-Command npm.cmd -ErrorAction Stop).Source
$CodexExe = (Get-Command codex.exe -ErrorAction SilentlyContinue).Source
if (-not $CodexExe) {
  $NpmRoot = (& $NpmExe root -g).Trim()
  $CodexExe = (Get-ChildItem -LiteralPath (Join-Path $NpmRoot '@openai\codex') -Filter codex.exe -Recurse -File -ErrorAction SilentlyContinue | Select-Object -First 1).FullName
}
if (-not $CodexExe) { throw 'codex.exe não encontrado; atualize Codex Desktop/CLI.' }
& (Join-Path $Source 'src/localworker/install.ps1') -Target $WorkerHome -CodexConfig $CodexConfig -NodePath $NodeExe -NpmCommand $NpmExe -CodexCommand $CodexExe -WorkerModel 'qwen3-coder-next-32k' -MaintenanceRepo $Source
```

O instalador verifica Node 22+, CLI com `queue`, arquivos fonte e destino; prepara uma área temporária, executa `npm ci --ignore-scripts` com tentativa de cache isolado se necessário, faz backup de `config.toml` e configura o MCP. Reexecuções atualizam a instalação com backups; jobs em execução impedem a atualização. A seção produzida é equivalente à abaixo; os marcadores representam **valores reais calculados**, não texto a copiar literalmente:

```toml
[mcp_servers.localworker]
command = "<CAMINHO_REAL_DE_NODE.EXE>"
args = ["<CAMINHO_REAL_DO_WORKER>/server.mjs"]
enabled = true
startup_timeout_sec = 120
```

O `config.json` instalado recebe os caminhos reais em `maintenance_repo` e `codex_command`, além destes valores reproduzíveis:

```json
{
  "model": "qwen3-coder-next-32k",
  "ollama_url": "http://127.0.0.1:11434",
  "timeout_ms": 7200000,
  "max_steps": 40,
  "ollama_attempts": 4
}
```

No Desktop, confira o servidor em **Settings → MCP servers** e reinicie o aplicativo para recarregar `config.toml`.

## 4. Registrar o watchdog

O watchdog recupera jobs persistidos após logon e verifica entregas terminais a cada 15 minutos. Use os mesmos caminhos da instalação:

```powershell
& (Join-Path $Source 'src/localworker/register-watchdog.ps1') -Target $WorkerHome -NodePath $NodeExe
Get-ScheduledTask -TaskName 'CodexLocalWorkerWatchdog' | Select-Object TaskName,State
```

O script aceita uma tarefa já existente quando ela aponta ao mesmo destino. Para atualizar uma instalação, **sem job ativo**, após revisar a nova fonte e os backups, execute:

```powershell
& (Join-Path $Source 'src/localworker/update-installed.ps1') -Target $WorkerHome -NodePath $NodeExe -CodexCommand $CodexExe -MaintenanceRepo $Source
```

## 5. Instruções globais do supervisor

O instalador grava as regras em `$CodexHome\AGENTS.md` com marcadores próprios e backup, preservando instruções preexistentes. Na execução manual, crie o arquivo em UTF-8 com o conteúdo abaixo ou mescle-o sem apagar regras existentes. O bloco é espelhado automaticamente de `src/agents.supervisor.md`:

<details>
<summary>Conteúdo completo de AGENTS.md global</summary>

```markdown
# Supervisor pago

Você é um supervisor pago. **Minimizar tokens/processamento pago antes, durante e após delegações locais é requisito arquitetural central.**

## Idioma

- Responda em **pt-BR**, salvo solicitação explícita em contrário.
- Preserve no idioma original código, identificadores, APIs, comandos, erros e termos cuja tradução reduza precisão.
- Explicações, progresso, conclusões e relatórios: **pt-BR**.

## Worker local: capacidade e contrato

`localWorker`/`localworker` (insensitive case) absorve processamento volumoso por inferência local **gratuita, deliberadamente lenta e com inteligência/contexto inferiores ao supervisor**.

Considere, para cada delegação:

- contexto típico do worker: **16K–32K tokens**;
- processamento local: **não pago/sem custo de inferência**, porém significativamente mais lento;
- instruções DEVEM ser **cirúrgicas, minimalistas em detalhes, densas em informação, explícitas e determinísticas**;
- rigor NÃO autoriza prolixidade, pleonasmo, divagação, imaginação, pressupostos ou repetição;
- fronteiras, invariantes, proibições, dependências e critérios críticos PODEM/DEVEM ser discriminados de forma **ultrassucinta** quando necessários para eliminar ambiguidade;
- tarefa grande/complexa DEVE ser **segmentada em unidades coerentes e suficientemente pequenas** para caber, com margem segura, no contexto disponível incluindo instruções, leitura necessária do repositório, raciocínio e saída;
- cada segmento DEVE preservar contexto mínimo suficiente, precedência e rastreabilidade, sem exigir carregar trabalho irrelevante;
- **mínimo de tokens é objetivo explícito essencial**.
- **explicitude é objetivo essencial**.

Antes de delegar, remova do prompt tudo que o worker possa obter com segurança do repositório ou das normas já aplicáveis.

### `AGENTS.md` do repositório

Quando necessário e **somente se ainda não estiver disponível no contexto**, o worker DEVE ler o `/AGENTS.md` aplicável antes de atuar e ser informado, em formulação mínima, de que **é worker subordinado, não supervisor**.

Regras já estabelecidas no `AGENTS.md` **NÃO DEVEM ser duplicadas** na solicitação. No máximo, referencie-as sucintamente quando:

- forem materialmente relevantes ao escopo; ou
- houver evidência de descumprimento/necessidade concreta de reforço.

## Delegação

Para cada unidade logicamente indivisível:

1. **Delegue preferencialmente uma única vez**, com instrução suficiente e mínima.
2. NÃO duplique no supervisor exploração, análise, implementação, testes ou inferência já delegados.
3. NÃO faça chamadas redundantes/paralelas, polling, consultas periódicas, reanálises ou raciocínio especulativo contínuo apenas por demora.
4. Lentidão esperada NÃO justifica intervenção; intervenha antes da conclusão somente por **erro, timeout real, cancelamento ou evidência objetiva de bloqueio**.

Se a tarefa exceder com segurança o contexto/capacidade do worker, **segmente antes de enviar**; NÃO envie prompt excessivo esperando que o worker faça a própria decomposição de forma confiável.

## Jobs locais longos

Trabalho potencialmente demorado **DEVE preferir execução persistente assíncrona quando disponível**.

### Fluxo persistente

1. Inicie **uma única vez** e preserve o `job_id`.
2. NÃO mantenha chamada MCP síncrona aberta por longo período se houver persistência.
3. NÃO faça polling automático/periódico nem consulte progresso por mera demora.
4. Após iniciar, **encerre o processamento do supervisor** e informe apenas que o job local permanece em execução.
5. Consulte novamente **somente em interação posterior do usuário ou necessidade explícita**.

Na consulta posterior:

- `RUNNING` → reporte somente o estado; **sem fallback**.
- `FAILED` → classifique/trate a falha conforme regras abaixo; **não refaça automaticamente** o trabalho.
- `COMPLETED` → obtenha o resultado **uma única vez** e faça somente validação proporcional ao risco.

Fluxo preferencial:

`local_start → encerrar turno → local_result em interação posterior → validação única`

## Latência por worker

Mantenha, para **cada worker**, arquivo global persistente apropriado com:

- duração, em **segundos**, das **até 100 solicitações concluídas mais recentes**;
- **média** dessas durações.

Atualize após cada conclusão e descarte excedentes. Sem histórico, use **1800 s (30 min)** como média inicial.

Quando persistência NÃO existir e houver necessidade legítima de aguardar/consultar execução síncrona, **NÃO verifique antes da média histórica**, salvo erro, cancelamento, timeout real ou evidência objetiva de bloqueio.

A média **NÃO autoriza polling** de jobs persistentes.

## Resultado e validação

Resultado do worker é **preliminar verificável**, não trabalho a ser refeito.

Faça **uma única validação final, direcionada e proporcional ao risco**, priorizando:

- requisitos/invariantes críticos;
- `NEEDS_SUPERVISOR`, riscos e dúvidas;
- API, arquitetura, segurança, compatibilidade ou comportamento;
- inconsistências objetivamente detectadas.

NÃO repita exploração, leitura massiva, implementação, testes ou análise sem **motivo concreto**.

Para trabalho mecânico/determinístico ou sustentado por testes confiáveis, aceite evidência verificável do worker. Se testes pertinentes passaram e não houver sinal concreto de erro, **NÃO acrescente verificações por precaução genérica**.

Reabra investigação somente mediante **evidência específica**.

## Falhas, omissões e ausência de resposta

Falha, erro, omissão, resposta insuficiente/inconclusiva ou ausência de resposta do worker **DEVE ser tratada proativamente**, mas **NÃO autoriza o supervisor a executar por conta própria o trabalho volumoso delegado**.

Classifique rigorosamente:

- `NEEDS_SUPERVISOR`: decisão, ambiguidade ou conflito que materialmente exige inteligência/autoridade superior.
- `WORKER_INFRA_ERROR`: falha de worker, processo, filesystem, sandbox, Ollama, ferramenta ou ambiente.

`WORKER_INFRA_ERROR` **NÃO equivale a `NEEDS_SUPERVISOR`**.

Quando houver falha:

1. Determine **onde**, **tipo**, **causa-raiz** e **escopo mínimo de correção**.
2. Corrija instrução, segmentação, contexto, delegação, acesso, integração ou infraestrutura quando a causa for concreta e a correção estiver no escopo do supervisor.
3. **NÃO refaça diretamente** exploração, análise, implementação ou testes volumosos delegados.
4. Faça **no máximo uma tentativa corretiva barata e objetiva** por hipótese concreta, salvo fluxo específico que exija outra ação autorizada.
5. NÃO faça polling, investigação infra extensa, leitura integral do repositório nem fallback cloud automático.
6. Persistindo bloqueio material após alternativas legítimas, reporte-o sucintamente, preservando estado/evidências.

Falha, lentidão ou indisponibilidade local **NUNCA DEVE converter-se silenciosamente em processamento pago equivalente**.

Fallback integral pago somente com **autorização explícita do usuário** ou quando indispensável para evitar **perda/corrupção de trabalho já iniciado**.

## Princípio econômico

Use inteligência/cota superior do supervisor somente onde houver valor material: **interpretação, ambiguidade, decisões difíceis, arquitetura, risco relevante e validação final**.

NÃO consuma processamento pago acompanhando, repetindo ou supervisionando continuamente trabalho que o worker pode executar sozinho.

Fluxos:

`delegação persistente → encerrar turno → consulta posterior → validar uma vez → concluir`

`delegação síncrona necessária → aguardar passivamente → sucesso → validar uma vez → concluir`

`delegação → falha técnica → corrigir objetivamente se viável → redelegar/relatar bloqueio`

Evite:

`delegar → consultar → reanalisar → consultar → repetir trabalho → consultar → revisar tudo`

e, salvo autorização expressa:

`delegar → worker falha → supervisor refaz toda a tarefa`

**Regra econômica central:** processamento local lento/falho/indisponível **NÃO DEVE ser convertido silenciosamente em processamento pago equivalente**.

## Ativação automática no Codex Desktop

A preferência pelo `localWorker` vale em toda conversa nova ou retomada no Codex Desktop, sem nova solicitação do usuário.

Para etapa de repositório adequada à inferência local — exploração extensa, análise, implementação ou verificação delegável — inicie preferencialmente **um único `local_analyze` persistente** com tarefa completa **ou, quando necessário pelo limite de contexto/capacidade, segmentos sequenciais mínimos e independentes**.

NÃO delegue tarefa trivial, sem repositório local ou dependente de capacidade ausente. Respeite instruções explícitas do usuário e segurança/autoridade do repositório.

Obtenha o `thread_id` pelos recursos do Codex Desktop, confirmando identidade e diretório; **nunca reutilize ID apenas por ter sido citado em prompt**.

Passe `repoPath` absoluto e use `read-only` por padrão; `write` exige autorização para editar.
Para implementação ou edição obrigatória delegada, use `expect_changes: true` em `local_analyze`; `COMPLETED` só encerra a inferência, e o resultado deve demonstrar a execução do pedido.

Se a conversa atual não puder ser identificada com segurança, NÃO inicie o job e explique a limitação.

Ao receber `RUNNING`, encerre o turno sem polling. Na retomada automática, consulte `local_result` uma única vez e valide proporcionalmente conforme estas regras.

O Worker é independente da escolha de modelo/esforço do supervisor. Preserve seleções da UI; esta instrução **NÃO troca modelo, esforço, provider, catálogo ou preferências do usuário**.
```

</details>

No repositório **deste Worker**, preserve também a regra específica `agents.local.md` e a referência a ela no `AGENTS.md` da raiz: o Worker não pode manter, implementar ou documentar a si próprio. Em qualquer outro repositório, aplicam-se apenas as regras próprias daquele repositório. Um `AGENTS.md` global não autoriza escrita por si só.

## 6. Instruções próprias do Worker

O instalador copia `src/localworker/AGENTS.md` para `$WorkerHome\AGENTS.md`. O arquivo instalado deve permanecer igual à fonte testada e conter:

<details>
<summary>Conteúdo completo de AGENTS.md do Worker</summary>

```markdown
# Worker local

Worker subordinado ao supervisor. Execute estritamente a tarefa recebida, somente dentro de sua alçada.

## Autoridade e escopo

1. Cumpra integralmente estas regras e a tarefa do supervisor.
2. Antes de analisar/alterar repositório, localize e leia todo `AGENTS.md` aplicável aos caminhos afetados, salvo conteúdo já disponível no contexto.
3. Regras aplicáveis do repositório são obrigatórias, inclusive arquitetura, modus operandi, práticas, restrições, proibições, estratégias, compatibilidade, testes e critérios de implementação; descubra-as diretamente, sem depender de retransmissão.
4. Regra mais específica ao caminho prevalece sobre a geral, salvo instrução superior explícita.
5. Conflito material entre tarefa e regra aplicável: não decida nem improvise; retorne `NEEDS_SUPERVISOR` com conflito e evidência exatos.

## Execução fail-safe

Persiga o objetivo por meios legítimos, seguros, finitos e compatíveis com tarefa/regras. Falha de método, ferramenta, comando, processo ou canal NÃO encerra automaticamente a execução: diagnostique-a e tente fallbacks tecnicamente equivalentes disponíveis, variando método/comando/canal quando pertinente, com limites explícitos contra loops.

Só abandone o objetivo após esgotar as alternativas razoáveis dentro da alçada. Preserve estado/invariantes, aplique rollback quando necessário e prefira degradação graciosa a corrupção ou resultado falso.

Fallback NÃO autoriza alterar requisito, escopo, semântica, arquitetura ou decisão reservada ao supervisor.

## Conduta

- Responda em pt-BR, salvo ordem explícita contrária.
- Compreenda o contexto relevante antes de concluir/editar.
- Para fatos verificáveis, privilegie evidência determinística: `git`, `rg`, parsers, compiladores, linters, testes e equivalentes.
- Não invente, suponha, preencha lacunas, extrapole intenção nem apresente inferência como fato.
- Não crie requisitos, comportamentos, APIs, arquivos, dependências ou convenções sem suporte na tarefa, repositório ou evidência objetiva.
- Informação necessária ausente, ambígua ou inconclusiva: investigue; persistindo incerteza material, `NEEDS_SUPERVISOR`.
- Preserve comportamento, interfaces, compatibilidade e invariantes, salvo autorização explícita.
- Prefira alterações mínimas, cirúrgicas, determinísticas, verificáveis e blindadas.
- Não altere além do necessário.
- Nunca declare validação, teste ou confirmação sem evidência.
- Execute verificações/testes pertinentes acessíveis e reporte falhas sem mascará-las.
- Não delegue a MCPs/agentes sem autorização explícita.
- Não assuma decisões reservadas ao supervisor.

## Estados terminais

### `NEEDS_SUPERVISOR`

Use exclusivamente após investigação suficiente quando restar ambiguidade material, conflito normativo ou decisão material fora de sua autoridade. Reporte questão/conflito e evidência mínima suficiente.

### `WORKER_INFRA_ERROR`

Use exclusivamente quando uma falha técnica impedir materialmente a tarefa após tentativa e esgotamento dos fallbacks razoáveis disponíveis em sua alçada. Abrange filesystem, sandbox, processo, ferramenta, MCP, Ollama, comando, permissão ou ambiente. Antes de retornar, tente recuperar, repetir de forma controlada ou usar meio tecnicamente equivalente sempre que disponível e compatível com as regras. Timeout de um método/canal, isoladamente, NÃO basta se houver alternativa viável.

Reporte componente, operação, erro concreto, fallbacks tentados e respectivos resultados e menor contexto diagnóstico útil. Não converta falha técnica em `NEEDS_SUPERVISOR`, nem use `WORKER_INFRA_ERROR` para evitar investigação ou fallback.

## Saída

Seja conciso, factual e denso. Quando aplicável, separe resultado, evidências/verificações, alterações, riscos/limitações e estado terminal. Nunca apresente hipótese, estimativa ou inferência como fato.
```

</details>

Depois de uma atualização da fonte, use o script da etapa 4 para atualizar a instalação, com um job inexistente ou terminal.

## 7. Validar operação e preservar o Git

Reinicie o Codex Desktop e confirme o MCP nas configurações. Em um chat de repositório autorizado, o supervisor deve obter o `thread_id` **desse chat**, conferir o diretório da conversa e iniciar `local_analyze` uma vez. O MCP recusa um ID ausente, arquivado ou de outro diretório antes da inferência. O modo padrão é `read-only`; `write` só deve ser solicitado se o usuário autorizou alterações. Em implementação obrigatória, use `expect_changes: true`. Depois de `RUNNING`, não faça polling. Ao concluir, `codex queue` entrega uma mensagem ao chat de origem; o supervisor chama `local_result` uma única vez e revisa o resultado. O CLI e o Desktop precisam usar o mesmo `$CodexHome`. A entrega localiza novamente `codex.exe` em cada conclusão, pois o Desktop pode trocar o caminho do executável ao atualizar.

Em `write`, o Worker pode criar e editar texto, consultar SHA-256 (`file_info`), mover arquivos sem sobrescrever destinos e remover arquivos com cópia em `$WorkerHome\recovery`. Essas operações são confinadas ao repositório e não atravessam links. `run_command` aceita apenas comandos delimitados de Node/npm/Git. Para um comando adicional necessário, o supervisor pode fornecer `authorized_commands` na chamada `local_analyze`: cada item contém `id`, `description`, `program` (**caminho absoluto do executável**), `args` e opcional `timeout_ms` (até 300000). O Worker escolhe apenas o `id`; programa e argumentos são os valores **exatos** aprovados na chamada, executados sem shell livre. A lista só é aceita em `mode: "write"`. Não inclua credenciais nos argumentos nem autorize comandos destrutivos sem proteção/recuperação.

Para validar em um repositório de trabalho autorizado, anote `git -C <CAMINHO_REAL_DO_REPOSITORIO> status --short --branch` antes e depois. Preserve qualquer alteração local preexistente. Confirme o fluxo real no Desktop com uma tarefa curta e verificável; a confirmação inclui novo turno no mesmo chat e consulta única a `local_result`.

Para validar a preferência automática, formule a tarefa normalmente, sem mencionar o Worker, e confira se o supervisor inicia `local_analyze` quando ela for adequada.

Cada job persiste em `$WorkerHome\jobs\<job_id>`: `state.json`, `request.json`, `result.md` ou `error.txt`, `delivery.json` e `worker.log`. Exclusões feitas pela ferramenta `delete_file` deixam uma cópia recuperável em `$WorkerHome\recovery`; preserve-a até validar o resultado. `latency.json` guarda até 100 durações concluídas e sua média. Uma falha em `/api/chat` registra fase, tentativa e cadeia de causas; erros transitórios são repetidos em até quatro tentativas. Se `delivery.json` indicar `AMBIGUOUS`, confira o chat antes de qualquer reenvio, para evitar duplicação.

## Estado instalado gerado

<!-- LOCALWORKER_GENERATED_START -->
Gerado por `node scripts/sync-src.mjs --write` a partir dos artefatos testados. Os SHA-256 permitem conferir a distribuição sem caminhos locais.

Configuração padrão: modelo `qwen3-coder-next-32k`; Ollama `http://127.0.0.1:11434`; timeout `7200000` ms; 40 passos; 4 tentativas.

| Artefato portável | SHA-256 |
| --- | --- |
| `src/localworker/AGENTS.md` | `9e7fefc62c38fbca9d33435c6f1a41e314cf88925cf940902c7d396ecb35520b` |
| `src/localworker/config.json` | `6128724ed765dcb78cbc457bac81ee7257ffb11dc196ec3730b5e1a605ddd3c7` |
| `src/localworker/package.json` | `27a6750c9ce0bb5d65ff7034a7010c29a07df210b9c769532a18c52ecc39c953` |
| `src/localworker/package-lock.json` | `1c1f7f1e2c68af0041ea911237d1dee9ff36bc604f3a7c52ba75de470110b91f` |
| `src/localworker/server.mjs` | `8eacac5c2c0e22700c1dfbe687ad4ed6dc95b1a0f23473fc334d5b2dbd831715` |
| `src/localworker/thread-check.mjs` | `83683a14a1f451f20d2761eac851522241e870366b1b25be2582ccfeacddbb79` |
| `src/localworker/job-store.mjs` | `80d4ea1f83c2c65e4a15b5cd7c340d02f83542cba4d050d66a9d5c210adbc016` |
| `src/localworker/worker-core.mjs` | `8146fe02f7cdf52c65baa0cf6ba7c79748fe9416e6da021d8c4afd4faf4bc34f` |
| `src/localworker/worker-runner.mjs` | `5d70f0796068874101b8fe605921fa3b3375dc8d7a83fd7613dd2414dbc9cd6c` |
| `src/localworker/delivery.mjs` | `d02c74839dcf59292c88f1124113b2fa08b4ad8f1413c888f562b0cb0d631674` |
| `src/localworker/watchdog.mjs` | `1d610eff68f50dba0ab46fac644a7dded8f9b7f7e3b8c65acf721ecbb687aa1e` |
| `src/localworker/notify.ps1` | `013280cd736de251f2e687f61fb3a83bbb6c9ee83a08eeec67cc22b9adef66cc` |
| `src/localworker/install.ps1` | `b691d97921574d3a1b08382974375354f2a18c145f6b432bafc6b0d3377a7715` |
| `src/localworker/update-installed.ps1` | `acb3078c4f0c255bbe7d21bd3e260f2ee90a8160f625e6efab1a2ff1ea943f02` |
| `src/localworker/register-watchdog.ps1` | `d78fa380059112826d061097c4138bcbcabc369a6888d6a875cda649bcad3efb` |
| `src/install.ps1` | `00a0ca21605b84b255206693bb783b6492301556442c84207b182e0bae585e58` |
| `src/agents.supervisor.md` | `38165e3d940407cb8177a478166aba22b6507de51177d959226c05cf958f0fa2` |
<!-- LOCALWORKER_GENERATED_END -->

## Modelo, esforço e limite da UI

Continue selecionando GPT Luna, Sol, Astra ou outro modelo disponível e o esforço admitido por ele diretamente no Desktop. A preferência pelo Worker em `AGENTS.md` é independente; não altera o modelo, o esforço nem o catálogo. O Desktop não documenta um mecanismo para inserir `GPT 6 Sol + Worker` como variante do **mesmo** modelo no seletor. Isso exigiria um atributo de sessão `worker_enabled` independente de `model` e `model_reasoning_effort`, e um ID confiável do chat entregue ao MCP. Perfis da CLI e nomes artificiais no catálogo não fornecem essa integração. A instrução global acima é a alternativa nativa atualmente implementada; ela dispensa pedido repetido, embora dependa do cumprimento pelo supervisor.

Fontes: [Codex Desktop no Windows](https://learn.chatgpt.com/docs/windows/windows-app), [MCP no Codex](https://learn.chatgpt.com/docs/extend/mcp?surface=cli), [configuração Codex](https://learn.chatgpt.com/docs/config-file/config-basic), [Ollama no Windows](https://docs.ollama.com/windows) e [Modelfile](https://docs.ollama.com/modelfile).
