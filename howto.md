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
| Acompanhar | `monitor_index_url` lista os jobs retidos e `monitor_url` mostra o detalhe; fechar a página não altera o job. |

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

### Recursos e fluidez do Windows

O Worker limita automaticamente os threads de CPU por requisição a no máximo 75% dos processadores lógicos; isso reserva capacidade potencial para o sistema, embora outros aplicativos também possam usá-la. Ele aguarda até dois minutos quando a RAM disponível cai abaixo da reserva de 10% ou 4 GiB (o maior valor). Em GPU NVIDIA mensurável, também aguarda se a VRAM livre não satisfizer a reserva de 10% ou 512 MiB (o maior). O Ollama distribui camadas entre GPU e CPU conforme a memória disponível; o instalador contabiliza pelo menos 20% da menor GPU NVIDIA como margem no planejamento de carga via `OLLAMA_GPU_OVERHEAD`. Essa opção é uma estimativa de carga, não um limite rígido: a alocação real e outros aplicativos podem consumir VRAM adicional. `LOCAL_WORKER_GPU_RESERVE_BYTES` permite definir um mínimo em bytes antes de instalar; valor preexistente maior não é reduzido. Se a VRAM cair abaixo da reserva **após** uma inferência, o Worker registra o evento, reduz automaticamente as camadas de GPU da próxima requisição e descarrega seu modelo; a calibração é reutilizada por até sete dias enquanto o modelo e a memória disponível permanecerem equivalentes. Sem pressão, mantém o modelo por até dois minutos ociosos, ajustáveis por `LOCAL_OLLAMA_KEEP_ALIVE`. Essas opções protegem a capacidade para o SO sem prometer que a VRAM livre ficará constante durante uma inferência já iniciada. [Ollama: alocação e concorrência e descarga do modelo](https://docs.ollama.com/faq), [opção de reserva de VRAM](https://github.com/ollama/ollama/blob/main/envconfig/config.go).

Se a saída do instalador contiver `ollama_restart_required_for_gpu_reserve: true`, feche o Ollama pela bandeja do Windows e abra-o novamente **após os jobs atuais terminarem**. A variável de usuário só é lida quando o servidor inicia. Confirme com `ollama ps` que o modelo usa CPU/GPU conforme a máquina e acompanhe a RAM/VRAM pelo Monitor do Worker; o instalador não interrompe jobs alheios para forçar a mudança.

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

O instalador verifica Node 22+, CLI com `queue`, arquivos fonte e destino; prepara uma área temporária, executa `npm ci --ignore-scripts` com tentativa de cache isolado se necessário, faz backup de `config.toml` e registra o MCP pelo CLI oficial. Reexecuções atualizam os arquivos e **reparam o registro MCP caso tenha desaparecido**, com backup e confirmação por `codex mcp get`; jobs em execução impedem a atualização do runtime. Se existir registro com comando diferente, o instalador interrompe a alteração da configuração e informa o conflito. A configuração produzida é equivalente à abaixo; os marcadores representam **valores reais calculados**, não texto a copiar literalmente:

```toml
mcp_optional_startup_grace_ms = 5000

[mcp_servers.localworker]
command = "<CAMINHO_REAL_DE_NODE.EXE>"
args = ["<CAMINHO_REAL_DO_WORKER>/server.mjs"]
startup_timeout_sec = 120
```

O `config.json` instalado recebe os caminhos reais em `maintenance_repo` e `codex_command`, além destes valores reproduzíveis:

```json
{
  "model": "qwen3-coder-next-32k",
  "ollama_url": "http://127.0.0.1:11434",
  "timeout_ms": 0,
  "max_steps": 40,
  "ollama_attempts": 4
}
```

No Desktop, confira o servidor em **Settings → MCP servers** e reinicie o aplicativo para recarregar `config.toml`. No PowerShell, defina `$env:CODEX_HOME = $CodexHome` e execute `& $CodexExe mcp list`; ele deve mostrar `localworker`. O caminho explícito evita consultar outro perfil do CLI em uma sessão isolada. Se não mostrar, execute novamente `src/install.ps1`. O watchdog agendado também repara uma perda posterior do registro sem reiniciar jobs. Uma conversa já iniciada pode usar a ponte abaixo imediatamente; para exibir as ferramentas nativas, o Desktop precisa recarregar seu catálogo. O valor de 5 s é uma janela para o catálogo inicial aguardar o MCP opcional; não limita a duração do job.

Se uma conversa já iniciada ainda não tiver `local_analyze`/`local_result`, use a ponte instalada para chamar **o mesmo servidor MCP** sem abrir outra conversa. Primeiro confirme pelo recurso de chats do Desktop que `$env:CODEX_THREAD_ID` é o ID desta conversa e que o diretório corresponde a `$RepoPath`; defina `$TaskText` com a unidade a delegar. No PowerShell:

```powershell
$request = @{ repoPath = $RepoPath; task = $TaskText; mode = 'read-only'; thread_id = $env:CODEX_THREAD_ID }
$encoded = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes(($request | ConvertTo-Json -Compress -Depth 10)))
& $NodeExe (Join-Path $WorkerHome 'mcp-call.mjs') local_analyze $encoded
```

Para consultar um job já concluído, substitua `$request` por `@{ job_id = $JobId }` e `local_analyze` por `local_result`. Em escrita autorizada, use `mode='write'`, `expect_changes=$true` e, se conhecidos, `required_change_paths`. O resultado JSON e o `job_id` são os mesmos da ferramenta MCP; ao terminar, o runner envia a retomada ao chat validado. A ponte recebe Base64 para que texto do pedido nunca seja interpolado como comando de shell. Ela não serve para contornar o bloqueio de autouso neste repositório.

### Acompanhamento e diagnóstico

Cada `local_analyze` devolve `job_id`, estado, `monitor_url` (detalhe) e `monitor_index_url` (inventário). `local_monitor` fornece o link atual do inventário sem `job_id`; `node <PASTA_DO_WORKER>/monitor.mjs index` faz o mesmo fora do MCP. Abra os links no navegador da mesma máquina quando quiser observar os jobs; a página é somente leitura e pode ser fechada a qualquer momento. Guarde os links como informação privada: contêm uma chave temporária de acesso local. O serviço escuta apenas em `127.0.0.1`, roda separado do runner e o watchdog o recupera após reinício. O inventário filtra por repositório Git e status, ordena por tempo ou status em ambos os sentidos e começa pelo mais recente. O detalhe apresenta duração, ciclos, ferramentas, caminhos acessados, eventos em ordem cronológica, erros, retries, entrega, tokens de entrada/saída e sinais de CPU/memória/GPU quando disponíveis. Contexto não comprovado aparece como indisponível; o custo de API da inferência Ollama local é zero, sem estimar energia. A UI atualiza sem recarga a cada três segundos no detalhe e dez segundos no inventário enquanto visível. Não mostra conteúdo dos arquivos nem raciocínio privado do modelo.

`ACTIVE` indica evento ou uso de recursos recente; `WAITING_MODEL` indica resposta do Ollama pendente; `STALLED_SUSPECTED` indica longa espera sem atividade observável; `STALLED` indica heartbeat/eventos atrasados; `ORPHANED` indica runner ausente; `TERMINAL_NOT_PROPAGATED` indica artefato final persistido antes de atualizar o estado. GPU não mensurável impede certeza sobre uma espera longa; o diagnóstico explicita esse limite. `local_status` fornece o mesmo diagnóstico sem abrir o navegador e reconcilia um job órfão. O runner chama `codex queue` assim que termina, sem polling do supervisor; o monitor e a tarefa agendada verificam somente anomalias. A recuperação registra o estado Git e não apaga arquivos parciais.

Cada pedido, estado, log e resultado fica em `jobs/<job_id>` exclusivo. A limpeza automática, a cada seis horas, mantém jobs terminais entregues por até 90 dias e limita esse histórico a 500 jobs e 512 MiB; remove os mais antigos quando algum limite é excedido. O log operacional de cada job é compactado ao atingir 2 MiB, preservando o evento de compactação e a cauda recente de 1 MiB; resultado e estado continuam separados. Jobs ativos ou com entrega pendente/ambígua nunca são apagados automaticamente. Ao chegar a 1000 jobs totais, o sistema tenta limpar os elegíveis e impede novos jobs com diagnóstico se o teto persistir. Configure antes de iniciar os processos por `LOCAL_WORKER_HISTORY_DAYS`, `LOCAL_WORKER_HISTORY_MAX_JOBS`, `LOCAL_WORKER_HISTORY_MAX_BYTES` e `LOCAL_WORKER_HISTORY_MAX_TOTAL_JOBS`. A limpeza registra contagem e erros em `history-cleanup.json` e não lê arquivos pessoais.

Para conferir afirmações sobre commits, use os campos `ahead` e `behind` da seção `ESTADO GIT DETERMINÍSTICO` retornada por `git_status`. Uma linha de arquivo modificado significa alteração no working tree; não demonstra commit não enviado.

Em tarefas de escrita, o Worker recebe avisos de orçamento de ciclos e deixa de fazer listagens amplas após metade deles sem alteração. Se ainda não concluir, a falha é `WORKER_INCOMPLETE`, acompanhada de contagens; o supervisor deve corrigir segmentação ou instrução antes de tentar novamente. Um limite de uso do Codex Desktop pode impedir que uma mensagem já enfileirada produza turno naquele momento: confira o estado da entrega e retome após a liberação da conta.

Quando a unidade de implementação tem arquivos-alvo definidos, passe caminhos relativos em `required_change_paths` junto de `expect_changes: true`. Exemplo fictício: `required_change_paths: ["scripts/verificar.py", "scripts/testar_verificar.py"]`. O Worker só pode concluir após alterar efetivamente cada alvo; executar testes ou editar outro arquivo não substitui essa prova. Testes falhos devolvem `stdout` e `stderr` limitados ao Worker para correção. O transporte do Ollama respeita o prazo configurado do job, inclusive quando a geração de resposta demora mais de cinco minutos.

## 4. Registrar o watchdog

O watchdog recupera jobs persistidos após logon e verifica anomalias a cada 2 minutos por padrão. A conclusão normal notifica o chat diretamente; esse intervalo não impõe espera ao job nem consome tokens do supervisor. Use os mesmos caminhos da instalação:

```powershell
& (Join-Path $Source 'src/localworker/register-watchdog.ps1') -Target $WorkerHome -NodePath $NodeExe
Get-ScheduledTask -TaskName 'CodexLocalWorkerWatchdog' | Select-Object TaskName,State
```

O script aceita uma tarefa já existente quando ela aponta ao mesmo destino. Para atualizar uma instalação, **sem job ativo**, após revisar a nova fonte e os backups, execute:

```powershell
& (Join-Path $Source 'src/localworker/update-installed.ps1') -Target $WorkerHome -NodePath $NodeExe -CodexCommand $CodexExe -CodexConfig $CodexConfig -MaintenanceRepo $Source
```

## 5. Instruções globais do supervisor

O instalador grava as regras com marcadores próprios e backup no arquivo global efetivo: `$CodexHome\AGENTS.override.md` se ele já existir; caso contrário, `$CodexHome\AGENTS.md`. O Codex lê o override primeiro, portanto gravar apenas no arquivo base quando houver override deixaria a preferência invisível. Na execução manual, escolha essa mesma regra e mescle o conteúdo abaixo em UTF-8 sem apagar instruções existentes. O bloco é espelhado automaticamente de `src/agents.supervisor.md` ([descoberta oficial de AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md)):
Uma cópia global legada idêntica à versão anterior, sem marcadores, é removida somente quando seu SHA-256 exato é reconhecido; outras instruções são preservadas.

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

O Worker deve preservar a fluidez do SO: kernel e serviços vitais têm precedência; CPU/GPU e respectivas memórias são combinadas conforme benefício mensurável, com reserva para o Windows e preferência operacional sobre apps não essenciais apenas na capacidade restante. Não solicite saturação, prioridade de tempo real nem consumo que prejudique a responsividade. Falta de recursos exige espera finita e diagnóstico. Correções devem alcançar a causa-raiz e generalizar para casos análogos.

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

Se `local_analyze` ou `local_result` estiver ausente do catálogo da sessão, trate isso como falha de integração recuperável, sem pedir fallback pago. Verifique o `CODEX_HOME` efetivo e repare o registro MCP pelo `mcp-config.mjs` instalado, usando o CLI Codex com `CODEX_HOME` explícito; confirme com `codex mcp get localworker --json`. Enquanto o catálogo do Desktop não recarrega, invoque a mesma ferramenta pelo `mcp-call.mjs` instalado, com argumentos JSON UTF-8 codificados em Base64. Essa ponte usa o próprio servidor e suas validações, retorna `job_id`/resultado e preserva a entrega automática ao chat. Não passe conteúdo bruto do usuário ao shell nem use o Worker para manter a si próprio. Se a ponte também falhar, classifique a falha concreta conforme as regras abaixo antes de interromper o pedido.

Para etapa de repositório adequada à inferência local — exploração extensa, análise, implementação ou verificação delegável — inicie preferencialmente **um único `local_analyze` persistente** com tarefa completa **ou, quando necessário pelo limite de contexto/capacidade, segmentos sequenciais mínimos e independentes**.

NÃO delegue tarefa trivial, sem repositório local ou dependente de capacidade ausente. Respeite instruções explícitas do usuário e segurança/autoridade do repositório.

Obtenha o `thread_id` pelos recursos do Codex Desktop, confirmando identidade e diretório; **nunca reutilize ID apenas por ter sido citado em prompt**.

Passe `repoPath` absoluto e use `read-only` por padrão; `write` exige autorização para editar.
Para implementação ou edição obrigatória delegada, use `expect_changes: true` em `local_analyze`; se os arquivos-alvo forem conhecidos, liste-os em `required_change_paths`. `COMPLETED` exige alteração líquida verificável nos alvos declarados; ainda assim o resultado deve demonstrar a execução do pedido e os testes pertinentes.

Se a conversa atual não puder ser identificada com segurança, NÃO inicie o job e explique a limitação.

Ao receber `RUNNING`, informe o `job_id`, o `monitor_url` e, quando presente, o `monitor_index_url` para acompanhar o job ou navegar pelo histórico; encerre o turno sem polling. Abrir ou fechar a interface não altera o job. Na retomada automática, consulte `local_result` uma única vez e valide proporcionalmente conforme estas regras.

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

Preserve a responsividade do sistema: kernel e serviços essenciais precedem o Worker; o Worker utiliza apenas a capacidade restante de CPU/GPU e RAM/VRAM, com preferência por GPU quando benéfica. Não force ocupação total ou prioridade que degrade o SO. Se recursos mínimos não puderem ser reservados, espere de forma limitada e registre o bloqueio técnico.

Corrija causas-raiz de maneira generalizável; não encerre uma correção limitada ao sintoma ou exemplo recebido.

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

Cada job persiste em `$WorkerHome\jobs\<job_id>`: `state.json`, `request.json`, `result.md` ou `error.txt`, `delivery.json`, `worker.log` e `runner-stderr.log`. O último guarda diagnóstico de falha inesperada do processo, sem depender da UI. Exclusões feitas pela ferramenta `delete_file` deixam uma cópia recuperável em `$WorkerHome\recovery`; preserve-a até validar o resultado. `latency.json` guarda até 100 durações concluídas e sua média. Uma falha em `/api/chat` registra fase, tentativa e cadeia de causas; erros transitórios são repetidos em até quatro tentativas. Se `delivery.json` indicar `AMBIGUOUS`, confira o chat antes de qualquer reenvio, para evitar duplicação.

## Estado instalado gerado

<!-- LOCALWORKER_GENERATED_START -->
Gerado por `node scripts/sync-src.mjs --write` a partir dos artefatos testados. Os SHA-256 permitem conferir a distribuição sem caminhos locais.

Configuração padrão: modelo `qwen3-coder-next-32k`; Ollama `http://127.0.0.1:11434`; `timeout_ms=0` (sem teto temporal total); 40 passos por segmento de contexto; 4 tentativas transitórias.

| Artefato portável | SHA-256 |
| --- | --- |
| `src/localworker/AGENTS.md` | `026b4c3cf431a01c08583cd882574f0a19ea772799117084255d2b0e580bf3aa` |
| `src/localworker/config.json` | `6147e1cfe3ef123def81c529b9d8b30f7771834ff15bf7333bbd1704ce96d1aa` |
| `src/localworker/package.json` | `27a6750c9ce0bb5d65ff7034a7010c29a07df210b9c769532a18c52ecc39c953` |
| `src/localworker/package-lock.json` | `1c1f7f1e2c68af0041ea911237d1dee9ff36bc604f3a7c52ba75de470110b91f` |
| `src/localworker/server.mjs` | `263606fe58785410d0c4402e89dfcd291a7556a1ce39515b3401048e94aa1828` |
| `src/localworker/thread-check.mjs` | `83683a14a1f451f20d2761eac851522241e870366b1b25be2582ccfeacddbb79` |
| `src/localworker/job-store.mjs` | `45654c33a7955d24fa38cc083c7691f01c1af48a6116a581ceb1108287fc4672` |
| `src/localworker/worker-core.mjs` | `cba00ce305d11eec23b022b03223703b6cf338b752330c736b3d805b497f6c31` |
| `src/localworker/worker-runner.mjs` | `cd0bb9b5f54dbd2f823064b6837b09e60dfb6242e9256929cd05d9ed99c59390` |
| `src/localworker/delivery.mjs` | `54bc2838896065e604df8c3992f665909b1f9f9209be3e94d372c64c706ec881` |
| `src/localworker/watchdog.mjs` | `2269620e4e43a847c1eacd894399f632fc1b66086b257b65118926049862caaf` |
| `src/localworker/monitor.mjs` | `9538f4a27d12663b4fa1902c47eb880bf854b2c2c05173d34f5175ec0b2dcdb3` |
| `src/localworker/monitor-page.mjs` | `5088b3c3399057ede65196afabf633b43c7eb83f9dc76f2d6fb2842355193de8` |
| `src/localworker/mcp-config.mjs` | `7fa6b853c9eb57b5fc3aa2c7ffeeb95818653874d6498955c98e0711906d1cdb` |
| `src/localworker/mcp-call.mjs` | `7b0b82af8abe603cb4f6ffbed93ac2d36c5c2d930ddca1ccc480fb62f53e6d5c` |
| `src/localworker/notify.ps1` | `013280cd736de251f2e687f61fb3a83bbb6c9ee83a08eeec67cc22b9adef66cc` |
| `src/localworker/install.ps1` | `c5ea8dd419ccac7c0c438a56c13d386d4715e1325c7f7b273150ea82b47fb797` |
| `src/localworker/update-installed.ps1` | `0567ac888f37fbfca393a579f16b0256c1ca5e81b65b07c525ccc33b741259d2` |
| `src/localworker/register-watchdog.ps1` | `8f0e04f10ac19212b7fd128da389f38c7cddfda7268b87997e8a5d9ebf5e7b3f` |
| `src/install.ps1` | `8236c3d99849796883031c16bcf86e2139efd0194ca2cbd4a4a9607d001ec670` |
| `src/agents.supervisor.md` | `15fa57f9d1eaafb28f2b5edbb9a174001ef120a689f089e2b2dd0ac4333fcbf0` |
<!-- LOCALWORKER_GENERATED_END -->

## Modelo, esforço e limite da UI

Continue selecionando GPT Luna, Sol, Astra ou outro modelo disponível e o esforço admitido por ele diretamente no Desktop. A preferência pelo Worker nas instruções globais é independente; não altera o modelo, o esforço nem o catálogo. A [documentação oficial de modelos](https://learn.chatgpt.com/docs/models) descreve o seletor de modelo/esforço, e as [configurações oficiais](https://learn.chatgpt.com/docs/developer-settings) documentam `config.toml` e MCP, mas não uma extensão do catálogo para variantes `GPT 6 Sol + Worker`. Isso exigiria um atributo de sessão `worker_enabled` independente de `model` e `model_reasoning_effort`, e um ID confiável do chat entregue ao MCP. Perfis da CLI e nomes artificiais no catálogo não fornecem essa integração. A instrução global acima é a alternativa nativa atualmente implementada; ela dispensa pedido repetido, embora dependa do cumprimento pelo supervisor.

Fontes: [Codex Desktop no Windows](https://learn.chatgpt.com/docs/windows/windows-app), [MCP no Codex](https://learn.chatgpt.com/docs/extend/mcp?surface=cli), [configuração Codex](https://learn.chatgpt.com/docs/config-file/config-basic), [Ollama no Windows](https://docs.ollama.com/windows) e [Modelfile](https://docs.ollama.com/modelfile).
