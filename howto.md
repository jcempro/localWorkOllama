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
4. Obtenha uma cópia **integral** deste projeto, inclusive `localworker/package-lock.json`, scripts `.ps1` e fontes `.mjs`. Este repositório não declara URL remota: peça ao responsável a URL Git ou um pacote íntegro. Se receber URL, use `git clone <URL_FORNECIDA> <PASTA_ESCOLHIDA>`. Esses marcadores não são valores reais.

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

Substitua `<PASTA_REAL_DO_PROJETO>` pelo caminho da fonte recebida. O destino e a base Codex derivam do perfil do usuário; se `CODEX_HOME` já existir, preserve esse valor. `npm ci` precisa de internet numa máquina limpa.

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
& (Join-Path $Source 'localworker/install.ps1') -Target $WorkerHome -CodexConfig $CodexConfig -NodePath $NodeExe -NpmCommand $NpmExe -CodexCommand $CodexExe -WorkerModel 'qwen3-coder-next-32k'
```

O instalador verifica Node 22+, CLI com `queue`, arquivos fonte e destino; copia os arquivos, executa `npm ci --ignore-scripts`, faz backup datado de `config.toml` e configura o servidor MCP. Recusa sobrescrever instalação/MCP existentes. A seção produzida é equivalente à abaixo; os marcadores representam **valores reais calculados**, não texto a copiar literalmente:

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
& (Join-Path $Source 'localworker/register-watchdog.ps1') -Target $WorkerHome -NodePath $NodeExe
Get-ScheduledTask -TaskName 'CodexLocalWorkerWatchdog' | Select-Object TaskName,State
```

O script preserva uma tarefa já existente. Para atualizar uma instalação, **sem job ativo**, após revisar a nova fonte e os backups, execute:

```powershell
& (Join-Path $Source 'localworker/update-installed.ps1') -Target $WorkerHome -NodePath $NodeExe -CodexCommand $CodexExe
```

## 5. Instruções globais do supervisor

O arquivo global é `$CodexHome\AGENTS.md`. Numa máquina limpa, crie-o em UTF-8 com o conteúdo abaixo (por exemplo, `notepad (Join-Path $CodexHome 'AGENTS.md')`, cole e salve). Se já existir, faça backup e mescle as regras sem apagar outras instruções. Este é o texto da configuração operacional atual, sem credenciais:

<details>
<summary>Conteúdo completo de AGENTS.md global</summary>

```markdown
# Supervisor pago

Você é um supervisor pago. **Minimizar processamento pago durante e após delegações locais é requisito arquitetural.**

## Idioma

- Responda ao usuário em **pt-BR**, salvo solicitação explícita em contrário.
- Preserve no idioma original código, identificadores, APIs, comandos, erros e termos cuja tradução reduza precisão.
- Explicações, conclusões, progresso e relatórios: **pt-BR**.

## Delegação local

O `localWorker`/`localworker` existe para absorver processamento volumoso em inferência local deliberadamente lenta.

Para cada etapa logicamente indivisível:

1. **Delegue preferencialmente uma única vez**, com instrução completa.
2. NÃO duplique no supervisor exploração, análise, implementação, testes ou inferência já delegados.
3. NÃO faça chamadas redundantes/paralelas, polling, consultas periódicas, reanálises ou raciocínio especulativo contínuo apenas devido à demora.
4. Lentidão esperada NÃO justifica intervenção. Intervenha antes da conclusão somente por **erro, timeout real, cancelamento ou evidência objetiva de bloqueio**.

## Jobs locais longos

Trabalho local potencialmente demorado **DEVE preferir execução persistente assíncrona quando disponível**.

### Fluxo persistente

1. Inicie o trabalho **uma única vez** e preserve o `job_id`.
2. NÃO mantenha chamada MCP síncrona aberta por longo período se houver execução persistente.
3. NÃO faça polling automático/periódico nem consulte progresso apenas porque o worker demora.
4. Após iniciar o job, **encerre o processamento do supervisor** e informe somente que o trabalho local permanece em execução.
5. Consulte novamente **somente em interação posterior do usuário ou necessidade explícita**.

Na consulta posterior:

- `RUNNING` → reporte somente o estado; **não faça fallback**.
- `FAILED` → classifique a falha; **não refaça automaticamente** o trabalho.
- `COMPLETED` → obtenha o resultado final **uma única vez** e faça somente a revisão proporcional ao risco.

Fluxo preferencial:

`local_start → encerrar turno → local_result em interação posterior → revisão única`

## Latência por worker

Mantenha, para **cada worker**, arquivo global persistente, em local/formato apropriados, contendo:

- duração, em **segundos**, das **até 100 solicitações concluídas mais recentes**;
- **média** dessas durações.

Atualize após cada resposta concluída, descartando registros além dos 100 mais recentes.

Na ausência de histórico, use **1800 s (30 min)** como média inicial.

Quando execução persistente NÃO estiver disponível e houver necessidade legítima de aguardar/consultar uma execução síncrona, **NÃO verifique retorno antes de transcorrer pelo menos a média histórica do worker**, salvo erro, cancelamento, timeout real ou evidência objetiva de bloqueio.

Essa média **NÃO autoriza polling** em jobs persistentes.

## Revisão após sucesso

O resultado do worker é **preliminar verificável**, não trabalho a ser refeito.

Faça **uma única validação final, direcionada e proporcional ao risco**, priorizando:

- requisitos e invariantes críticos;
- `NEEDS_SUPERVISOR`, riscos e dúvidas;
- alterações de API, arquitetura, segurança, compatibilidade ou comportamento;
- inconsistências objetivamente detectadas.

NÃO repita exploração, leitura massiva, implementação, testes ou análises já executados sem **motivo concreto**.

Para trabalho mecânico/determinístico ou sustentado por testes confiáveis, aceite evidências verificáveis do worker. Se os testes pertinentes passaram e não houver sinal concreto de erro, **NÃO acrescente verificações por precaução genérica**.

Reabra investigação somente mediante **evidência específica**.

## Falhas e controle de custo

Falha do `localWorker`/`localworker` **NÃO autoriza automaticamente fallback para processamento pago**.

Classifique rigorosamente:

- `NEEDS_SUPERVISOR`: decisão, ambiguidade ou conflito que materialmente exige inteligência/autoridade superior.
- `WORKER_INFRA_ERROR`: falha de worker, processo, filesystem, sandbox, Ollama, ferramenta ou ambiente.

`WORKER_INFRA_ERROR` **NÃO equivale a `NEEDS_SUPERVISOR`**.

Em `WORKER_INFRA_ERROR`:

1. NÃO refaça no supervisor exploração, análise ou implementação volumosa delegada.
2. Faça **no máximo uma tentativa corretiva barata e objetiva**, somente havendo causa concreta e correção evidente.
3. NÃO faça polling, investigação infra extensa, leitura integral do repositório nem fallback cloud automático.
4. Persistindo a falha, **reporte sucintamente o bloqueio e interrompa a delegação**.
5. Fallback integral pago somente com **autorização explícita do usuário** ou quando indispensável para evitar **perda/corrupção de trabalho já iniciado**.

Demora ou falha local **NUNCA DEVE ser convertida silenciosamente em processamento pago equivalente**.

## Princípio econômico de supervisão

Use a cota/inteligência superior do supervisor somente onde houver valor material: **interpretação, ambiguidades, decisões difíceis, arquitetura, riscos relevantes e validação final**.

NÃO consuma processamento pago acompanhando, repetindo ou supervisionando continuamente trabalho que o worker pode executar sozinho.

Fluxos normativos:

`delegação persistente → encerrar turno → consulta posterior → validar uma vez → concluir`

`delegação síncrona necessária → aguardar passivamente → sucesso → validar uma vez → concluir`

`delegação → falha técnica → corrigir uma vez se trivial → reportar bloqueio`

Evite:

`delegar → consultar → reanalisar → consultar → repetir trabalho → consultar → revisar tudo`

e, salvo exceção expressamente autorizada:

`delegar → worker falha → supervisor refaz toda a tarefa`

**Regra econômica central:** falha, lentidão ou indisponibilidade de processamento local/gratuito **NÃO DEVE converter-se silenciosamente em processamento pago equivalente**.

## Ativação automática do localWorker no Codex Desktop

A preferência pelo `localWorker` vale em toda conversa nova ou retomada no Codex Desktop, sem o usuário precisar solicitá-lo novamente. Para etapa de repositório adequada à inferência local (exploração extensa, análise, implementação ou verificação delegável), inicie preferencialmente um único `local_analyze` persistente com tarefa completa. Não delegue tarefas triviais, sem repositório local ou que dependam de capacidade ausente. Respeite instruções explícitas do usuário e as regras de segurança e autoridade do repositório.

Obtenha o `thread_id` da conversa que faz a chamada pelos recursos do Codex Desktop, confirmando identidade e diretório; nunca reutilize um ID apenas porque foi citado em um prompt. Passe `repoPath` absoluto e use `read-only` por padrão; `write` exige autorização para editar. Se a conversa atual não puder ser identificada com segurança, não inicie o job e explique a limitação. Ao receber `RUNNING`, encerre o turno sem polling. Na retomada automática, consulte `local_result` uma única vez e revise proporcionalmente, seguindo as regras acima.

O Worker é um recurso de execução independente da escolha do modelo e do esforço de raciocínio do supervisor. Preserve as seleções feitas na UI; esta instrução não troca modelo, esforço, provider, catálogo nem preferências do usuário.
```

</details>

No repositório **deste Worker**, preserve também a regra específica `agents.local.md` e a referência a ela no `AGENTS.md` da raiz: o Worker não pode manter, implementar ou documentar a si próprio. Em qualquer outro repositório, aplicam-se apenas as regras próprias daquele repositório. Um `AGENTS.md` global não autoriza escrita por si só.

## 6. Instruções próprias do Worker

O instalador copia `localworker/AGENTS.md` para `$WorkerHome\AGENTS.md`. O arquivo instalado deve permanecer igual à fonte e conter:

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

Reinicie o Codex Desktop e confirme o MCP nas configurações. Em um chat de repositório autorizado, o supervisor deve obter o `thread_id` **desse chat**, conferir o diretório da conversa e iniciar `local_analyze` uma vez. O MCP recusa um ID ausente, arquivado ou de outro diretório antes da inferência. O modo padrão é `read-only`; `write` só deve ser solicitado se o usuário autorizou alterações. Depois de `RUNNING`, não faça polling. Ao concluir, `codex queue` entrega uma mensagem ao chat de origem; o supervisor chama `local_result` uma única vez e revisa o resultado. O CLI e o Desktop precisam usar o mesmo `$CodexHome`.

Em `write`, o Worker pode criar e editar texto, consultar SHA-256 (`file_info`), mover arquivos sem sobrescrever destinos e remover arquivos com cópia em `$WorkerHome\recovery`. Essas operações são confinadas ao repositório e não atravessam links. `run_command` aceita apenas comandos delimitados de Node/npm/Git. Para um comando adicional necessário, o supervisor pode fornecer `authorized_commands` na chamada `local_analyze`: cada item contém `id`, `description`, `program` (**caminho absoluto do executável**), `args` e opcional `timeout_ms` (até 300000). O Worker escolhe apenas o `id`; programa e argumentos são os valores **exatos** aprovados na chamada, executados sem shell livre. A lista só é aceita em `mode: "write"`. Não inclua credenciais nos argumentos nem autorize comandos destrutivos sem proteção/recuperação.

Neste projeto, **somente** `jeancarloem.com.blog` é permitido como repositório de exemplo e teste. Um caminho como `D:\trampo\jeancarloem.com.blog` é fictício; obtenha uma cópia autorizada e use seu caminho real. Antes e depois, anote `git -C <CAMINHO_REAL_DO_BLOG> status --short --branch`. Os testes exigem checkout limpo: se houver alterações locais, preserve-as e use outra cópia limpa, sem reset. `test-write.mjs` cria e remove um único arquivo temporário controlado. Os scripts usam Ollama e entrega simulados e verificam estados, retry de transporte e Git:

```powershell
$env:TEST_REPO_PATH = '<CAMINHO_REAL_DO_BLOG>'
& $NodeExe (Join-Path $Source 'localworker/test-integration.mjs')
& $NodeExe (Join-Path $Source 'localworker/test-transient.mjs')
& $NodeExe (Join-Path $Source 'localworker/test-write.mjs')
& $NodeExe (Join-Path $Source 'localworker/test-operations.mjs')
git -C $env:TEST_REPO_PATH status --short --branch
```

Os scripts exigem `TEST_REPO_PATH` apontando para uma pasta chamada `jeancarloem.com.blog`; um erro de parâmetro não valida a integração. **Testes simulados não provam a UI.** Faça depois um job real, curto, em `read-only`, a partir do Desktop e confira novo turno **no mesmo chat**. Para validar a preferência automática, formule a tarefa normalmente, sem mencionar o Worker, e confira se o supervisor inicia `local_analyze` quando a tarefa for adequada.

Cada job persiste em `$WorkerHome\jobs\<job_id>`: `state.json`, `request.json`, `result.md` ou `error.txt`, `delivery.json` e `worker.log`. Exclusões feitas pela ferramenta `delete_file` deixam uma cópia recuperável em `$WorkerHome\recovery`; preserve-a até validar o resultado. `latency.json` guarda até 100 durações concluídas e sua média. Uma falha em `/api/chat` registra fase, tentativa e cadeia de causas; erros transitórios são repetidos em até quatro tentativas. Se `delivery.json` indicar `AMBIGUOUS`, confira o chat antes de qualquer reenvio, para evitar duplicação.

## Modelo, esforço e limite da UI

Continue selecionando GPT Luna, Sol, Astra ou outro modelo disponível e o esforço admitido por ele diretamente no Desktop. A preferência pelo Worker em `AGENTS.md` é independente; não altera o modelo, o esforço nem o catálogo. O Desktop não documenta um mecanismo para inserir `GPT 6 Sol + Worker` como variante do **mesmo** modelo no seletor. Isso exigiria um atributo de sessão `worker_enabled` independente de `model` e `model_reasoning_effort`, e um ID confiável do chat entregue ao MCP. Perfis da CLI e nomes artificiais no catálogo não fornecem essa integração. A instrução global acima é a alternativa nativa atualmente implementada; ela dispensa pedido repetido, embora dependa do cumprimento pelo supervisor.

Fontes: [Codex Desktop no Windows](https://learn.chatgpt.com/docs/windows/windows-app), [MCP no Codex](https://learn.chatgpt.com/docs/extend/mcp?surface=cli), [configuração Codex](https://learn.chatgpt.com/docs/config-file/config-basic), [Ollama no Windows](https://docs.ollama.com/windows) e [Modelfile](https://docs.ollama.com/modelfile).
