# localWorker no Codex Desktop (Windows 11 2025H2+)

## Compactação do supervisor após delegar

Esta sequência é o **modus operandi obrigatório** do supervisor, definido no AGENTS global; não é preciso repeti-la em cada pedido. Uma promessa de compactar não comprova a ação.

A norma global instalada exige: recibo `RUNNING` → preservar o mínimo necessário à retomada → avisar no chat com links → compactar o contexto do supervisor → encerrar. Vale para todas as conversas/repositórios, sem configurar agents.local.md em cada um. Somente uso **<10%**, comprovado por medida atual obtida sem custo ou com custo desprezível, dispensa compactar; 10% ou percentual indisponível não dispensam.

O Desktop oferece **Compactar** no menu `/` (`/compactar` em pt-BR). A ação automática depende de o cliente expor esse recurso ao agente na conversa viva. Um botão disponível para o usuário não garante essa interface programática. Na sessão verificada, ela não está exposta: a obrigação global fica instalada, mas a execução automática permanece **impedida**, não concluída. O supervisor deve informar esse limite. Usar manualmente o comando é uma alternativa humana; não é prova da automação solicitada. Não enviar o texto `/compactar` como mensagem comum, editar bancos de histórico ou compactar uma cópia da conversa.

Para atualizar apenas essa norma, a partir da raiz do repositório:

```powershell
& .\src\install.ps1 -GlobalRulesOnly
```

O instalador descobre CODEX_HOME e respeita AGENTS.override.md quando presente, preservando as demais instruções com backup. Essa operação não inicia/interrompe Worker, troca modelo/esforço, cria tarefa ou abre Desktop. A fonte integral da norma está reproduzida na seção de instruções globais deste artigo. [Protocolo oficial de compactação](https://learn.chatgpt.com/docs/app-server#trigger-thread-compaction).

## Opcional: continuar o supervisor depois da restauração da cota

Após reinício inesperado, o runtime reconstrói um índice ativo corrompido a partir dos estados íntegros e preserva o original com hash. Se o recibo de envio estiver corrompido, o job fica com entrega `AMBIGUOUS`: conferir o chat de origem é obrigatório antes de qualquer reenvio. Os arquivos críticos são sincronizados antes da substituição atômica; isso reduz perda por interrupção, sem garantir a integridade de hardware ou energia.

Sem job ativo, o índice reconstruído fica ausente, representação compatível com servidores MCP anteriores ainda carregados na sessão. Atualizar arquivos não recarrega automaticamente módulos de um processo existente. Se a sessão continuar retornando erro antigo já corrigido e nenhum job tiver sido criado, use a ponte instalada descrita abaixo; ela inicia o servidor atualizado, preserva os mesmos contratos e a entrega ao chat. Nunca reenvie uma mutação cuja execução esteja incerta.

O atualizador usa a mesma recuperação com raiz destino explícita antes de verificar jobs ativos. Assim, pode atualizar uma instalação antiga cujo `active.json` esteja corrompido; estados inválidos ou múltiplos jobs ativos impedem a atualização com diagnóstico, preservando os originais.

No monitor, o evento `strategy_adaptation` indica duas ações sem progresso: o runtime orientou uma alternativa legítima e informou comandos obrigatórios pendentes. A guarda continua interrompendo quatro ações improdutivas; a orientação não concede acesso adicional nem transforma testes em implementação.

Após concluir a instalação e autenticação descritas neste artigo, o componente separado `src/supervisor/` pode acompanhar uma conversa autorizada sem inferência. Fluxo: **telemetria oficial → saldo ≤10% → tarefa em reset+60s → prontidão → `continue` único → confirmação**. Ele não altera o Worker nem o modelo/esforço do chat.

No PowerShell, a partir da raiz obtida deste repositório:

**A cobertura é por conversa.** Execute a instalação para cada chat autorizado; instalar somente um chat não protege os demais, mesmo no mesmo projeto ou conta. Os destinos e tarefas ficam separados pelo ID. A disponibilidade do Worker não instala automaticamente este componente.

Atualizações do Desktop podem mudar o caminho versionado de `codex.exe`: a instalação e cada passagem recuperam automaticamente um CLI disponível pelos mecanismos de descoberta já instalados. Não edite manualmente o hash da pasta. Se nenhuma alternativa válida existir, o estado registra `CODEX_CLI_UNAVAILABLE` e preserva os eventos para recuperação posterior.

Com autorização U6C vigente, se o último turno falhou com o código verificável `usageLimitExceeded`, a recuperação também cobre esse incidente: aguarda reset+60s se a cota continuar limitada, ou retoma na próxima passagem se a restauração já ocorreu. Essa recuperação tardia fica identificada no evento e não é apresentada como disparo pontual no passado. Um turno novo iniciado manualmente antes do envio resolve a pendência sem outro `continue`.

A guarda compartilhada C9R distingue essa falha de quota de cancelamento. Um callback antigo recusado como `ORIGIN_TURN_STOPPED`, comprovadamente não enviado, é recuperável na mesma sessão/instância/turno se a causa estruturada continuar sendo quota. O watchdog revalida esse caso; não repete recibos aceitos/ambíguos, não libera pausas explícitas nem abre o Desktop. Para retomada após a quota, SR-001 precisa estar instalado e autorizado **naquela conversa**; atualizar arquivos não remove uma pausa anterior. Os ensaios isolados de quota/restauração não esgotam a conta real nem comprovam um reboot físico.

Eventos de restauração para a mesma origem não enviam duas continuações: a reserva persistida de outro evento prevalece, inclusive quando incerta. Se já há entrada na fila do chat, `WAITING_QUEUED_INPUT` aguarda seu processamento sem mensagem adicional, ativação ou inferência paga de monitoramento. O diagnóstico distingue espera de conclusão; mensagem já aceita pela plataforma não pode ser revogada por uma API inexistente.

```powershell
$ConversaS8R = Read-Host 'ID confirmado da conversa original no Codex Desktop'
$RepositorioS8R = Read-Host 'Caminho absoluto do projeto associado a essa conversa'
& ./src/supervisor/install.ps1 -ThreadId $ConversaS8R -RepoPath $RepositorioS8R
```

A abertura/fechamento manual e a intenção humana prevalecem sobre recuperação. Para autorizar retomadas futuras de trabalho pendente na sessão aberta, informe o diretório retornado pelo instalador; `Resume` não envia mensagem imediatamente. Use `Pause` para suspender explicitamente:

```powershell
$DestinoU6C = Read-Host 'Diretório instalado desta conversa'
$ConfigU6C = Join-Path $DestinoU6C 'config.json'
& (Join-Path $DestinoU6C 'platform.ps1') -Action Resume -Config $ConfigU6C
& (Join-Path $DestinoU6C 'platform.ps1') -Action Pause -Config $ConfigU6C
```

Reboot, fechamento/reabertura do Desktop, turno interrompido/substituído ou observação incerta pausam a autorização; abrir o aplicativo novamente não rearma eventos antigos. O script nunca abre Desktop fechado. Em Windows, `continuity.ps1` observa boot e janela/PID/início; outras plataformas ficam bloqueadas por falta de observação implementada. Sem prova da causa de fechamento não se presume crash. `PAUSED_USER` preserva resultados/recibos, sem falso sucesso; uma nova autorização humana permite recuperação compatível. Mensagens já aceitas na fila nativa não têm revogação disponível no CLI verificado; não se altera SQLite para apagá-las.

Callbacks de jobs novos vinculam sessão, Desktop e turno originador, sem depender de SR-001. Para reaproveitar resultado após pausa, consulte-o no chat original; não reinicie inferência. Somente para callback comprovadamente não enviado (`PAUSED_USER`, `not_sent=true`), existe retomada explícita, sem replay de envio aceito/ambíguo:

```powershell
$WorkerU6C = Read-Host 'Diretório instalado do Worker'
$JobU6C = Read-Host 'ID confirmado do job pausado'
node (Join-Path $WorkerU6C 'delivery.mjs') resume $JobU6C
```

O ID deve ser obtido e confirmado pelas ferramentas do Desktop, junto ao diretório; não use exemplo ou ID de outro chat. O instalador verifica a identidade na API. `-Target`, `-CodexHome`, `-WorkerHome`, `-NodeExe`, `-CodexExe`, `-OllamaExe` e `-ScanMinutes` permitem caminhos/intervalo específicos. A instalação normal usa descoberta de executáveis e `CODEX_HOME`/`LOCAL_WORKER_HOME` quando definidos. Autentique-se no próprio Desktop antes de instalar; não cole tokens em arquivos.

A instalação começa pausada. A tarefa de detecção faz observação gratuita a cada 2 minutos, sem logon/boot nem despertar do SO; somente trabalho pendente sob autorização U6C válida pode criar tarefa no timestamp oficial de restauração +60s. `status.json` e `events/` no destino informado pelo instalador registram operação, impedimentos e confirmação. Verifique uma vez a prontidão com `node <destino>/run.mjs --probe`, substituindo `<destino>` pelo path real instalado. Scripts e configurações canônicos estão integralmente em [src/supervisor](src/supervisor/README.md), incluindo interfaces e comandos de diagnóstico/teste.

Somente na mesma sessão/instância autorizada, se o `continue` exato ainda estiver na fila daquele chat, o script pode ativar seu destino pela rota nativa registrada `codex://threads/<ID confirmado>`, sem enviar outra mensagem. Isso pode selecionar o chat original na UI, uma vez por evento/instância do aplicativo; não abre console transitório. Sem protocolo ou recibo correlacionável, registra impedimento. Ativar o chat não é sucesso: só a resposta final sem erro e com identidade confirmada permite `COMPLETED`.

Não há garantia de pontualidade de um Windows desligado, sem logon ou sem rede. Login que exige pessoa permanece bloqueio explícito. Um recibo sem identidade de mensagem não permite atribuir inequivocamente a resposta ao envio: o estado será `RESPONSE_OBSERVED_UNCORRELATED`, nunca `COMPLETED` presumido. O script não repete envio ambíguo. Tarefas de outros componentes e arquivos pessoais são preservados. Remoção/desativação, retenção e recuperação estão no contrato vinculado; o Worker continua independente deste componente.

A compactação preserva o último lote de respostas de ferramentas até o modelo examiná-lo, incluindo código. Uma conclusão recusada por requisito pendente é marcada como rascunho sem aceite: sob pressão, seu texto público fica integralmente em checkpoint verificado, com reidratação por `context_recall`, e o contexto ativo mantém a recusa/próximo passo. Normas, objetivo e decisões consolidadas não são descartados. O campo `rejected_drafts_archived` aparece no evento de compactação; `rejected_draft=true` identifica a entrada reidratada. Se o checkpoint falhar, o histórico ativo permanece íntegro; uma base irredutível ainda exige segmentação. Raciocínio privado não acompanha esse rascunho. Recibos de execução e commits permanecem no estado preservado; um retorno que não caiba com segurança exige segmentação, sem descarte silencioso. O Git comprova estado/versionamento, mas não substitui leitura dos arquivos necessários à análise.

No monitor, **Todos os jobs** mostra barras de CPU, GPU, RAM e VRAM globais da máquina, atualizadas automaticamente a cada dez segundos. A primeira leitura de CPU pode aparecer indisponível até haver duas amostras. GPU/VRAM exigem a fonte NVIDIA já usada pelo runtime; ausência aparece explicitamente. Abra um job para ver suas métricas e a timeline, com eventos mais recentes no topo; o histórico original permanece intacto.

O runtime instalado inclui `progress-guard.mjs`: repetições determinísticas são bloqueadas antes de executar; quatro ações sem progresso verificável encerram a unidade com diagnóstico. O log `strategy_blocked` registra classes e hashes de ações/estados. Para continuar, corrija a pré-condição, use alternativa autorizada ou conceda ao Worker somente o acesso exato necessário. Não aumente o teto de ciclos para mascarar loops. Retries transitórios seguros continuam limitados; uma falha de validação permanece pendente até passar.

## Manutenção do próprio Worker

O modo híbrido é exclusivo do próprio produto; outros repositórios conservam seu regime. O supervisor avalia risco e decide: C≤5 usa o mesmo Worker como júnior; 5<C≤7 permite escolha fundamentada entre supervisor exclusivo, júnior ou estagiário; C>7 exige supervisor exclusivo. Scripts/Skills inequivocamente triviais, determinísticos e seguros, com procedência, imutabilidade/integridade e proteção previamente comprovadas, são preferidos em qualquer criticidade; acima de7 são executados pelo supervisor. Nome/hash isolado não comprova segurança. Incerteza material impede delegação até esclarecimento.

Após adotar essa governança no repositório do produto, acrescente `-EnableHybridMaintenance` à instalação completa descrita abaixo (também funciona na atualização). Sem essa opção na primeira adoção, mantém-se o veto anterior; atualizações seguintes preservam a escolha. Não combine com `-GlobalRulesOnly`. Preserve o marcador de identidade; mudar caminhos não dispensa a guarda.

Prepare um JSON de `local_analyze` com raiz/conversa confirmadas e a menor unidade já avaliada pelo supervisor. Acrescente `maintenance_supervision` conforme [todos os campos e limites](src/README.md#manutenção-própria-sw-hybrid-v1). Nenhum campo pode ser preenchido pelo Worker. Antes do envio, calcule o vínculo sobre o pedido completo, substituindo somente `scope_sha256` pelo resultado:

```powershell
$PedidoS4W = Read-Host 'Path do JSON da unidade avaliada pelo supervisor'
$InstalacaoS4W = Read-Host 'Path real da instalação do Worker'
$ObjetoS4W = Get-Content -LiteralPath $PedidoS4W -Raw | ConvertFrom-Json
$ObjetoS4W.maintenance_supervision.scope_sha256 = ''
$Base64S4W = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes(($ObjetoS4W | ConvertTo-Json -Depth 30 -Compress)))
# O calculador e o runtime usam source/content com trim de bordas igual ao MCP.
# Whitespace interno é preservado; mudanças no conteúdo exigem novo hash/avaliação.
$HashS4W = & node (Join-Path $InstalacaoS4W 'delegation-policy.mjs') --hash-base64 $Base64S4W
if ($LASTEXITCODE -ne 0 -or $HashS4W -notmatch '^[a-f0-9]{64}$') { throw 'Vínculo não calculado; não envie o job.' }
$ObjetoS4W.maintenance_supervision.scope_sha256 = [string]$HashS4W
$Base64S4W = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes(($ObjetoS4W | ConvertTo-Json -Depth 30 -Compress)))
# Somente se o catálogo nativo estiver desatualizado: mesma ponte, guardas e entrega.
& node (Join-Path $InstalacaoS4W 'mcp-call.mjs') local_analyze $Base64S4W
if ($LASTEXITCODE -ne 0) { throw 'Pedido não confirmado; reconcilie os efeitos antes de tentar novamente.' }
```

No catálogo nativo, envie o mesmo objeto com o hash conferido. Modificar tarefa, comandos, paths, requisitos ou avaliação invalida o vínculo; reavalie antes de recalcular. O hash confere consistência, não autentica nem certifica a nota. Estagiário em escrita tem uma ação com efeito exatamente aprovada e commit pelo supervisor. Outra tentativa exige checkpoint: efeito anterior é preservado, classificação `NEEDS_SUPERVISOR`, retomada por evento e revisão antes da próxima unidade. Leitura/validação autorizada continua possível. Não há troca de modelo, polling pago ou replay de efeitos.

## Objetivo e percurso

`command_sequence` não carrega política GPU nem prepara/compacta contexto: não depende do Ollama ou do teto de ciclos de inferência. Cada comando mantém seu timeout técnico, autorização, evidência e validação; a sequência tem no máximo 32 IDs distintos e para no primeiro erro. Se os comandos passarem, mas faltar a alteração, validação ou commit exigido pelo contrato, o resultado informa essa pendência específica, sem repetir comandos nem alegar esgotamento de ciclos. Recursos consumidos pelo executável autorizado ainda precisam ser avaliados pelo supervisor antes da delegação.

Para analisar evidências já verificadas sem repetir exploração, envie `provided_evidence: {"source":"origem rastreável", "content":"evidência mínima"}` em `read-only` (valores fictícios). Limites: origem de 1–1024 caracteres e conteúdo de 1–12000, sem segredos. Não dispensa leituras/comandos declarados obrigatórios e não prova execução pelo Worker. O recibo distingue a base fornecida de leituras próprias.

A remoção e a retenção também abrangem checkpoints em `context/`. Links ou diretórios inesperados bloqueiam a limpeza com diagnóstico; backups recuperáveis continuam protegidos. Use a lixeira do monitor para excluir um job terminal, nunca apague pastas compartilhadas para contornar uma falha.

O Worker pode usar CLIs, scripts e integrações realmente disponíveis, com comandos exatos autorizados e efeitos proporcionais ao risco. Para leitura, declare `authorized_commands[].mode='read-only'`; rede exige autorização de destinos/efeitos e `network=true`. Esses campos não são sandbox nem firewall do programa: cabe ao supervisor verificar o script/argv. `latency.json` é atualizado pelo runner, sem contagem manual duplicada. `QUEUED_TO_CHAT` significa mensagem enfileirada; um turno interrompido ou bloqueado pela cota do supervisor permanece pendente mesmo com entrega correta.

Para delegar com aceite verificável, informe `required_read_paths` (arquivos relativos de evidência) e `required_command_ids` (IDs cuja execução deve passar). Para uma sequência totalmente preparada, use `command_sequence: ["preparar", "validar"]`, com ambos os comandos em `authorized_commands`: não há inferência nesse fluxo, e erro interrompe a sequência sem retry de mutação. Os nomes são exemplos fictícios. Autorize apenas comandos que respeitem a governança do alvo; confira dependências antes de enviar. `repeatable` é `false` por padrão; use `true` somente para reexecução segura necessária, como testes após edição. `commit_policy` é `worker` por padrão; `supervisor` significa que o supervisor fará o commit imediato após revisão, inclusive quando houver alterações herdadas. Não significa dispensar commit. O resultado contém recibos e cada job guarda `evidence.jsonl` privado (até 16 MiB) para auditoria.

Este guia reproduz a instalação do `localWorker` em um Windows 11 2025H2 ou posterior **limpo**. O Worker usa Ollama para tarefas extensas em um repositório, persiste cada job e devolve o resultado ao **mesmo chat** do Codex Desktop. O supervisor decide e revisa; o usuário continua escolhendo o GPT e seu esforço de raciocínio normalmente.

Ao receber uma FT ampla, o supervisor identifica as menores unidades funcionais e pode delegar ao Worker também levantamentos ou partes do planejamento. Cada job tem objetivo e aceite delimitados; a conclusão oferece um checkpoint para conferir direção e qualidade antes do próximo. Essa supervisão por eventos evita tanto processamento pago contínuo quanto horas de execução em uma direção incorreta. O contrato permanente está em `RCF.md`, seção “Supervisão responsável e segmentada”.

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

Os caminhos neste artigo são calculados a partir da máquina. Um caminho como `C:\Exemplo\projeto` é **fictício**, nunca um local presumido. Execute os comandos em PowerShell como o usuário do Codex; aceite elevação somente quando o Windows a pedir para instalar aplicativos ou registrar uma tarefa. As verificações Node dos instaladores preservam aspas no Windows PowerShell 5.1 e no PowerShell 7, sem exigir troca de shell. Tenha internet, autorização de instalação e espaço para um modelo Ollama de dezenas de GB. Não coloque tokens, senhas nem dados privados nos exemplos.

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

O Worker limita automaticamente os threads de CPU por requisição a no máximo 75% dos processadores lógicos; isso reserva capacidade potencial para o sistema, embora outros aplicativos também possam usá-la. Quando a RAM disponível cai abaixo da reserva de 10% ou 4 GiB (o maior valor), ele aguarda até dois minutos e tenta descarregar somente o próprio modelo Ollama carregado; após liberação comprovada, concede nova janela de até dois minutos sem reduzir a reserva do Windows. Em GPU NVIDIA mensurável, também aguarda se a VRAM livre não satisfizer a reserva de 10% ou 512 MiB (o maior). O Ollama distribui camadas entre GPU e CPU conforme a memória disponível; o instalador contabiliza pelo menos 20% da menor GPU NVIDIA como margem no planejamento de carga via `OLLAMA_GPU_OVERHEAD`. Essa opção é uma estimativa de carga, não um limite rígido: a alocação real e outros aplicativos podem consumir VRAM adicional. `LOCAL_WORKER_GPU_RESERVE_BYTES` permite definir um mínimo em bytes antes de instalar; valor preexistente maior não é reduzido. Se a VRAM cair abaixo da reserva **após** uma inferência, o Worker registra o evento, reduz automaticamente as camadas de GPU da próxima requisição e descarrega seu modelo; a calibração é reutilizada por até sete dias enquanto o modelo e a memória disponível permanecerem equivalentes. Sem pressão, mantém o modelo por até dois minutos ociosos, ajustáveis por `LOCAL_OLLAMA_KEEP_ALIVE`. Essas opções protegem a capacidade para o SO sem prometer que a VRAM livre ficará constante durante uma inferência já iniciada. [Ollama: alocação e concorrência e descarga do modelo](https://docs.ollama.com/faq), [opção de reserva de VRAM](https://github.com/ollama/ollama/blob/main/envconfig/config.go).

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

Para consultar um job já concluído, substitua `$request` por `@{ job_id = $JobId }` e `local_analyze` por `local_result`. Em escrita autorizada, use `mode='write'`, `expect_changes=$true` e, se conhecidos, `required_change_paths`. O resultado JSON e o `job_id` são os mesmos da ferramenta MCP; ao terminar, o runner envia a retomada ao chat validado. A ponte recebe Base64 para que texto do pedido nunca seja interpolado como comando de shell. Ela não contorna a política de manutenção própria ou qualquer guarda.

### Acompanhamento e diagnóstico

Cada `local_analyze` devolve `job_id`, estado, `monitor_url` (detalhe) e `monitor_index_url` (inventário). `local_monitor` fornece o link atual do inventário sem `job_id`; `node <PASTA_DO_WORKER>/monitor.mjs index` faz o mesmo fora do MCP. Abra os links no navegador da mesma máquina quando quiser observar os jobs; fechá-la não altera a execução. Guarde os links como informação privada: contêm uma chave temporária de acesso local. O serviço escuta apenas em `127.0.0.1`, roda separado do runner e o watchdog o recupera após reinício. O inventário filtra por repositório Git e status, ordena por tempo ou status em ambos os sentidos e começa pelo mais recente. O detalhe apresenta duração, ciclos, ferramentas, caminhos acessados, eventos em ordem cronológica, erros, retries, entrega e tokens de entrada/saída. Logo abaixo dos cards, a seção Recursos mostra barras para CPU, CPU Ollama, RAM, RAM Ollama, GPU e VRAM. Percentuais de CPU/GPU são medidos; RAM/VRAM mostram uso e capacidade observada. Uma barra neutra indica medição indisponível, sem total presumido. Os processos Ollama podem atender outros jobs, portanto sua medição não representa uso exclusivo do job aberto. Contexto não comprovado aparece como indisponível; o custo de API da inferência Ollama local é zero, sem estimar energia. A UI atualiza sem recarga a cada três segundos no detalhe e dez segundos no inventário enquanto visível. Não mostra conteúdo dos arquivos nem raciocínio privado do modelo.

Na última coluna do inventário e no cabeçalho do detalhe, **STOP** aparece para job ativo e **lixeira** para job terminal. STOP mostra animação durante a tentativa, bloqueia outro clique e solicita a interrupção somente daquele `job_id`. O estado muda para `CANCELLED` apenas depois de verificar que o runner terminou; a entrega ao chat desse job fica `SUPPRESSED_CANCELLED`. Se o encerramento não for confirmável, a UI restaura STOP e informa o erro. A lixeira pede confirmação e apaga definitivamente o histórico exclusivo do job. Se a limpeza falhar após começar, `DELETE_PENDING` permanece visível para nova tentativa. Backups recuperáveis de arquivo apagado pelo Worker são protegidos para evitar perda de dados: se estiverem ligados ao job ou se um backup antigo não identificar com segurança sua autoria, a UI informa o bloqueio e não declara exclusão concluída. As mesmas operações estão nas ferramentas MCP `local_cancel` e `local_delete`, ambas com `job_id`.

`ACTIVE` indica evento ou uso de recursos recente; `WAITING_MODEL` indica resposta do Ollama pendente; `STALLED_SUSPECTED` indica longa espera sem atividade observável; `STALLED` indica heartbeat/eventos atrasados; `ORPHANED` indica runner ausente; `TERMINAL_NOT_PROPAGATED` indica artefato final persistido antes de atualizar o estado. GPU não mensurável impede certeza sobre uma espera longa; o diagnóstico explicita esse limite. `local_status` fornece o mesmo diagnóstico sem abrir o navegador e reconcilia um job órfão. O runner chama `codex queue` assim que termina, sem polling do supervisor; o monitor e a tarefa agendada verificam somente anomalias. A recuperação registra o estado Git e não apaga arquivos parciais. O monitor usa `127.0.0.1:49767`, ou `127.0.0.1:49768` se a primeira porta estiver ocupada; ambas ocupadas exigem liberar uma delas. A tarefa agendada usa Windows Script Host para iniciar o watchdog sem console visível.

Uma chamada rejeitada duas vezes não deve consumir todos os ciclos: o Worker bloqueia apenas aquela combinação de ferramenta e argumentos, registra o motivo e tenta outra forma permitida. Quando o contrato precisa de acesso maior, ele deve indicar ao supervisor o acesso exato em `NEEDS_SUPERVISOR`. A prova de edição compara também o conteúdo dos arquivos novos ainda não rastreados pelo Git; não exige `git add`.

Em modo de escrita persistente, o Worker valida e registra cada unidade funcional autônoma com `git_commit_unit(message, paths)`, restrita aos caminhos alterados pelo próprio job e limpos no início. Arquivos já modificados antes do job, repositórios aninhados e validações ainda falhas impedem o commit. O supervisor confere o resultado e tenta o push antes da próxima unidade; uma FT grande deve ser delegada em segmentos menores para não acumular várias unidades completas sem commit.

Cada pedido, estado, log e resultado fica em `jobs/<job_id>` exclusivo. A limpeza automática, a cada seis horas, mantém jobs terminais entregues por até 90 dias e limita esse histórico a 500 jobs e 512 MiB; remove os mais antigos quando algum limite é excedido. O log operacional de cada job é compactado ao atingir 2 MiB, preservando o evento de compactação e a cauda recente de 1 MiB; resultado e estado continuam separados. Jobs ativos ou com entrega pendente/ambígua nunca são apagados automaticamente. Ao chegar a 1000 jobs totais, o sistema tenta limpar os elegíveis e impede novos jobs com diagnóstico se o teto persistir. Configure antes de iniciar os processos por `LOCAL_WORKER_HISTORY_DAYS`, `LOCAL_WORKER_HISTORY_MAX_JOBS`, `LOCAL_WORKER_HISTORY_MAX_BYTES` e `LOCAL_WORKER_HISTORY_MAX_TOTAL_JOBS`. A limpeza registra contagem e erros em `history-cleanup.json` e não lê arquivos pessoais.

Para conferir afirmações sobre commits, use os campos `ahead` e `behind` da seção `ESTADO GIT DETERMINÍSTICO` retornada por `git_status`. Uma linha de arquivo modificado significa alteração no working tree; não demonstra commit não enviado.

Em tarefas de escrita, o Worker recebe avisos de orçamento de ciclos e deixa de fazer listagens amplas após metade deles sem alteração. O padrão de 40 ciclos é teto técnico configurável por `LOCAL_WORKER_MAX_STEPS`, não limite de tempo; ele protege contra loops e esgotamento do contexto. Chamadas recusadas repetidamente param antes desse teto. Se uma tarefa produtiva não couber na janela, o supervisor deve segmentá-la preservando evidências, em vez de elevar o teto sem medir recursos e qualidade. A falha é `WORKER_INCOMPLETE`, acompanhada de contagens. Um limite de uso do Codex Desktop pode impedir que uma mensagem já enfileirada produza turno naquele momento: confira o estado da entrega e retome após a liberação da conta.

### Compactação segura de contexto

Para atualizar enquanto houver um job ativo, use `pwsh -NoProfile -File .\src\install.ps1 -SkipPrerequisites -SkipModel -WaitForIdle`. A opção aguarda eventos locais de estado e instala quando o job termina; não cancela o Worker, não usa inferência paga e não impõe prazo ao job. A verificação gratuita de recuperação de evento perdido ocorre no máximo a cada minuto. Sem a opção, a instalação continua recusando atualização durante execução.

Em falhas, consulte `error_kind` de `local_result`, `error.txt` e `git-status.txt` no diretório do job. `CONTEXT_CAPACITY` significa que o contexto restante não pôde ser reduzido com segurança; não é evidência de defeito do hardware. O estado Git é coletado também em falhas, e qualquer indisponibilidade de coleta aparece explicitamente. Jobs anteriores à atualização conservam seus artefatos originais.

O Ollama aceita histórico enviado a cada `/api/chat` e `num_ctx` por requisição. O Worker conserva literalmente regras e objetivo originais; antes de pressão crítica de contexto, RAM ou VRAM, arquiva mensagens antigas em `jobs/<job_id>/context/cNNNN.json`, verifica o SHA-256 e só então mantém no prompt um índice recuperável e as mensagens recentes. `context_recall` devolve trechos exatos desse arquivo quando o Worker precisar de decisão ou evidência anterior. O histórico arquivado integra a retenção e a exclusão do respectivo job. O pedido envia `truncate:false` e `shift:false` para impedir descarte implícito pelo Ollama. Se não houver redução segura, o job registra a limitação e preserva o histórico; contexto grande demais gera `WORKER_INCOMPLETE` explícito.

Configure a janela inicial por `-ModelContextTokens` no instalador, `LOCAL_WORKER_CONTEXT_TOKENS` ou `context_tokens` no `config.json` instalado (padrão: 32768) e o piso por `LOCAL_WORKER_MIN_CONTEXT_TOKENS` ou `min_context_tokens` (padrão: 8192). A estimativa dispara em 68% da janela; ajuste o gatilho por `LOCAL_WORKER_CONTEXT_TRIGGER_FRACTION` (maior que 0,56 e até 0,8). RAM e VRAM disparam ao se aproximarem a 1 GiB e 512 MiB das reservas; configure as margens por `LOCAL_WORKER_CONTEXT_RAM_MARGIN_BYTES` e `LOCAL_WORKER_CONTEXT_VRAM_MARGIN_MIB`. O mecanismo exige redução mínima de 512 tokens estimados por checkpoint e reduz progressivamente a quantidade de mensagens recentes quando necessário. O alvo de 56% é uma preferência, não motivo para rejeitar economia útil. Não há teto cumulativo de checkpoints produtivos. Evidência recém-reidratada permanece até a próxima inferência. Uma recusa explícita de contexto permite até duas recuperações na mesma chamada, somente após redução comprovada; base irredutível gera `WORKER_INCOMPLETE: CONTEXT_CAPACITY`. Só reduz `num_ctx` se o prompt couber com margem. A seção de diagnóstico mostra janela ativa e contagem; a timeline mostra motivo, estimativa antes/depois, medições de memória, estratégia e tokens observados. Essas medições podem incluir outros processos e não demonstram economia exclusiva do Worker. O Ollama atual também oferece compactação na API Responses, mas ela não é intercambiável com o histórico e as ferramentas de `/api/chat`; este instalador usa checkpoints próprios verificáveis sem mudar o protocolo do agente.

Quando a unidade de implementação tem arquivos-alvo definidos, passe caminhos relativos em `required_change_paths` junto de `expect_changes: true`. Inclua o artefato funcional, não somente um arquivo de estado. Exemplo fictício: `required_change_paths: ["scripts/verificar.py", "scripts/testar_verificar.py"]`. O Worker só pode concluir após alterar efetivamente cada alvo; executar testes ou editar outro arquivo não substitui essa prova. Testes falhos devolvem `stdout` e `stderr` limitados ao Worker e bloqueiam `COMPLETED` até nova execução bem-sucedida do mesmo comando. O transporte do Ollama respeita o prazo configurado do job, inclusive quando a geração de resposta demora mais de cinco minutos.

## 4. Registrar o watchdog

O watchdog verifica silenciosamente dados/jobs e anomalias a cada 2 minutos por padrão; logon não autoriza abrir interfaces ou retomar conversas. Callbacks exigem vínculo U6C válido. A conclusão normal notifica o chat diretamente; esse intervalo não impõe espera ao job nem consome tokens do supervisor. Use os mesmos caminhos da instalação:

```powershell
& (Join-Path $Source 'src/localworker/register-watchdog.ps1') -Target $WorkerHome -NodePath $NodeExe
Get-ScheduledTask -TaskName 'CodexLocalWorkerWatchdog' | Select-Object TaskName,State
```

O registro usa `src/localworker/watchdog-launch.vbs.template`, substituindo os dois marcadores por paths descobertos e escapados; não edite o `.vbs` instalado:

```vbscript
Set shell = CreateObject("WScript.Shell")
shell.Run Chr(34) & "__NODE_EXECUTABLE__" & Chr(34) & " " & Chr(34) & "__WATCHDOG_SCRIPT__" & Chr(34), 0, True
```

O script aceita uma tarefa já existente quando ela aponta ao mesmo destino. Para atualizar uma instalação, **sem job ativo**, após revisar a nova fonte e os backups, execute:

```powershell
& (Join-Path $Source 'src/localworker/update-installed.ps1') -Target $WorkerHome -NodePath $NodeExe -CodexCommand $CodexExe -CodexConfig $CodexConfig -MaintenanceRepo $Source
```

## 5. Instruções globais do supervisor

Cada job recebe uma unidade especializada que caiba com margem no contexto: objetivo, alvos, dependências, automação e aceite. Comandos triviais baratos podem ser executados diretamente; execuções demoradas/volumosas compatíveis são delegadas explicitamente. Após falha, o supervisor diagnostica evidências e pode criar novo job com correção material e vínculo ao anterior, sem autorização redundante. O job antigo permanece preservado; repetir as mesmas condições é proibido. A instalação abaixo distribui essas regras e a mensagem de retomada correspondente; o cumprimento semântico pelo modelo continua sujeito à validação do supervisor.

O instalador grava as regras com marcadores próprios e backup no arquivo global efetivo: `$CodexHome\AGENTS.override.md` se ele já existir; caso contrário, `$CodexHome\AGENTS.md`. O Codex lê o override primeiro, portanto gravar apenas no arquivo base quando houver override deixaria a preferência invisível. Na execução manual, escolha essa mesma regra e mescle o conteúdo abaixo em UTF-8 sem apagar instruções existentes. O bloco é espelhado automaticamente de `src/agents.supervisor.md` ([descoberta oficial de AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md)):
Uma cópia global legada idêntica à versão anterior, sem marcadores, é removida somente quando seu SHA-256 exato é reconhecido; outras instruções são preservadas.

Para atualizar somente as instruções depois da instalação, inclusive com job ativo, use `& (Join-Path $Source 'src/install.ps1') -CodexHome $CodexHome -GlobalRulesOnly`. Esse modo reutiliza a mesma mesclagem/backup, sem reinstalar runtime, alterar modelo, registrar tarefas ou aguardar o Worker. Não comprova prontidão do Worker; não combine com `-SkipGlobalRules`. Bloco parcial permanece preservado e gera diagnóstico.

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

Use `required_read_paths` para os arquivos cuja leitura fundamenta a unidade e `required_command_ids` para validações/comandos obrigatórios. Permissão para executar não equivale a execução exigida: declare ambos. `git_status` não comprova revisão de conteúdo. Para sequência já integralmente preparada e governada, use `command_sequence` com IDs autorizados na ordem exata: o runtime executa sem inferência e interrompe no primeiro erro preservando efeitos. Comandos mutantes devem ter precondições e pós-condições, reconhecer estado já aplicado e separar patch de teste; sucesso não autoriza repetição. Marque `repeatable=true` somente em comandos seguros que precisam reexecutar, como teste após nova edição. Na análise, confira evidências/citações, não somente `COMPLETED`.

Defina `commit_policy='supervisor'` quando o job não tiver autorização para commit ou envolver alterações herdadas que a guarda de propriedade deve preservar; isso transfere o commit imediato da unidade ao supervisor, não dispensa versionamento. O padrão `worker` mantém a exigência de commit local. Antes de delegar scripts, confira executável, dependências, contrato de argumentos e pré-condições. `authorized_commands[].program` exige path absoluto do executável realmente descoberto; `description` aceita até 240 caracteres. Argumentos são argv exatos, inclusive multiline, sem shell intermediário.

### `AGENTS.md` do repositório

Quando necessário e **somente se ainda não estiver disponível no contexto**, o worker DEVE ler o `/AGENTS.md` aplicável antes de atuar e ser informado, em formulação mínima, de que **é worker subordinado, não supervisor**.

Cada repositório tem seu próprio `agents.local.md`. Para cada delegação, supervisor e Worker DEVEM usar somente o arquivo local do `repoPath` alvo, quando existir, sem transportar conteúdo ou permissões de outro repositório. Hooks, Skills, Subagents, scripts, especializações e configurações locais só podem ser considerados disponíveis após comprovação no alvo ou em sua governança aplicável. Somente o núcleo upstream/original de `AGENTS.md` pode ser comum, quando efetivamente presente. A ausência de extensão local não autoriza presumir uma equivalente.

Regras, scripts e recursos necessários à operação geral do supervisor ou Worker DEVEM estar instalados em paths acessíveis aos respectivos processos. A leitura e o uso desses artefatos por uma delegação a outro repositório não podem depender da presença da árvore de desenvolvimento do localWorker. Recursos exclusivos do alvo são descobertos nesse alvo; mecanismo obrigatório ausente gera diagnóstico e correção de instalação/autorização antes do uso.

Regras já estabelecidas no `AGENTS.md` **NÃO DEVEM ser duplicadas** na solicitação. No máximo, referencie-as sucintamente quando:

- forem materialmente relevantes ao escopo; ou
- houver evidência de descumprimento/necessidade concreta de reforço.

## Manutenção do próprio produto

Somente quando a governança local e a instalação adotarem SW-HYBRID, substitua o veto anterior de manutenção própria pelo contrato `maintenance_supervision` v1. Avalie TODAS as etapas de risco exclusivamente no supervisor: Worker não calcula, estima, classifica, pondera, recomenda nem filtra dados por risco. Consultas factuais estritamente objetivas exigem mecanismos previamente verificados e conferência pelo supervisor. C considera consequências em cadeia, dependências, alcance, reversibilidade, dados/contratos, controles/testes e incerteza sobre usos futuros; não invente probabilidades ou ausência de risco pela aparência. 0 tende a desprezível, 5 é indeterminação/neutro (não probabilidade 50/50), 10 iminente/intolerável.

0≤C≤5: mesmo Worker júnior; ações triviais podem usar scripts determinísticos. 5<C≤7: escolha fundamentadamente exclusivo/júnior/estagiário, sem subfaixas inventadas. C>7: exclusivamente supervisor, sem Worker. Dúvida material que possa superar 7 impede delegação. Reavalie diante de mudança de escopo/achados. Júnior mantém autonomia micro e aceite; estagiário exige unidade menor, ação com efeito exata aprovada e checkpoint/revisão intermediária antes de outro efeito, usando commit_policy=supervisor. Não trocar modelo para representar patente. Avaliação/escopo/hashes são fornecidos pelo supervisor, nunca pelo Worker. Só prossiga após conferir evidências reais, regras e validações; eventos de revisão não autorizam polling pago. Sem adoção/contrato válido, o veto permanece. Esta regra não altera o regime dos demais repositórios, seus mecanismos, recursos ou autoridade.

## Delegação

Na manutenção própria, scripts/Skills inequivocamente triviais e determinísticos, seguros, com segurança, procedência, imutabilidade/integridade e inviolabilidade previamente verificadas PODEM e DEVEM ser preferidos inclusive em C≥5. Confira fonte/dependências/efeitos, versão/hashes e proteção contra alteração/redirecionamento antes de executar. Não presumir inviolabilidade por nome ou hash isolado; sem prova, não usar essa exceção. C>7 mantém execução exclusivamente pelo supervisor, inclusive desses mecanismos; avaliação de risco nunca é delegada. Não prometer proteção absoluta inexistente.

Para análise exclusivamente de evidência já obtida, use `provided_evidence={source,content}` em `read-only`, com origem rastreável e conteúdo mínimo verificado. Isso permite resposta sem nova chamada de ferramenta, não comprova execução própria e não dispensa `required_read_paths` ou `required_command_ids`. Não use essa opção para simular implementação ou validação atual.

Compense a assimetria cognitiva com linguagem explícita: não presuma que nomes, comandos, siglas ou conceitos tenham a mesma semântica nos dois ambientes. Traduza para objetivo, comportamento e resultado esperado; verifique capacidades reais e elimine lacunas materiais antes de efeitos. Macro, arquitetura, dependências, sequência, risco e qualidade global são sua responsabilidade; o Worker tem autonomia técnica máxima compatível com o microescopo e pode fornecer insumos delimitados de planejamento. Não o restrinja por ser Worker: recursos nativos/extensíveis realmente disponíveis podem ser concedidos sob limites de escopo, contexto, segurança, privacidade e autoridade, inclusive externos quando autorizados. Capacidade ausente não deve ser simulada. Para operações críticas, estabeleça checkpoints antes de efeitos difíceis de reverter, supervisão mais intensa orientada a eventos, menor privilégio e recuperação/rollback; para operações não críticas, preserve autonomia local. Reavalie decisões anteriores incompatíveis de forma cirúrgica e sem regressão. Manutenção do próprio produto exige a norma local e política híbrida explicitamente adotadas; sem elas, conserve o veto de autouso.

Comandos exatos cujos efeitos de somente leitura foram verificados podem declarar `authorized_commands[].mode='read-only'`, inclusive em job `read-only`. Não marque comando como leitura por seu nome nem use esse campo para permitir escrita oculta. O padrão continua `write`.

O Worker é executor especializado, não destinatário generalista. Somente delegue unidades pequenas, específicas, autocontidas, verificáveis e delimitadas. A responsabilidade por estimar, segmentar e controlar o escopo é exclusivamente do supervisor.

Antes de cada job, avalie objetivo, arquivos/contexto, complexidade, dependências, volume de leitura/alteração e risco de expansão. Estime a ocupação incluindo normas, ferramentas, leituras, histórico e saída; preserve margem segura na janela efetiva (tipicamente até 32K). Possibilidade relevante de extrapolação ou exploração ampla exige decomposição prévia, nunca confiar na compactação para tornar segura uma delegação excessiva. Registre concisamente objetivo, alvos, dependências, limite de escopo, automação disponível, evidência e aceite; incerteza sobre o volume exige uma unidade menor de levantamento delimitado.

### Automação determinística

Identifique scripts, comandos, hooks e Skills comprovadamente disponíveis no alvo; indique-os explicitamente e prefira-os ao trabalho manual equivalente. O supervisor pode executar diretamente operação determinística trivial, objetiva e previsível quando execução e leitura mínima do resultado custarem menos que delegar. Se puder demorar, exigir acompanhamento prolongado, gerar saída volumosa ou ocupar contexto/processamento pago relevante, delegue a execução compatível ao Worker com comando/script, parâmetros, sequência, resultado esperado, critério de conclusão e retorno mínimo exatos. Não permaneça consumindo processamento pago para aguardar. Capacidade/permissão ausente não pode ser presumida; manutenção própria exige a política híbrida adotada, sem a qual o veto permanece.

Para cada unidade logicamente indivisível:

1. **Delegue preferencialmente uma única vez**, com instrução suficiente e mínima.
2. NÃO duplique no supervisor exploração, análise, implementação, testes ou inferência já delegados.
3. NÃO faça chamadas redundantes/paralelas, polling, consultas periódicas, reanálises ou raciocínio especulativo contínuo apenas por demora.
4. Lentidão esperada NÃO justifica intervenção; intervenha antes da conclusão somente por **erro, timeout real, cancelamento ou evidência objetiva de bloqueio**.

Se a tarefa exceder com segurança o contexto/capacidade do worker, **segmente antes de enviar**; NÃO envie prompt excessivo esperando que o worker faça a própria decomposição de forma confiável.

Antes de delegar uma FT, compreenda seu objetivo e estado relevante e divida-a em menores unidades coerentes e verificáveis, avaliando arquivos/contexto, dependências, risco, custo e capacidade real do Worker. Delegue também partes delimitadas da exploração, análise, arquitetura ou planejamento quando isso poupar processamento pago. Defina para cada unidade fronteiras, evidência e critério de aceite. Na conclusão ou bloqueio, faça um checkpoint proporcional ao risco, corrija desvio antes da próxima unidade e preserve a responsabilidade final de engenharia. Não envie `implemente a FT` monolítica nem aguarde o fim da FT para descobrir direção errada. Checkpoint é orientado a evento, sem polling pago contínuo. O Worker deve aplicar `AGENTS.md` e os Skills, scripts, hooks e Subagents realmente ativados; forneça autorização exata para mecanismo necessário fora das ferramentas delimitadas.

## Jobs locais longos

Trabalho potencialmente demorado **DEVE preferir execução persistente assíncrona quando disponível**.

### Fluxo persistente

1. Inicie **uma única vez** e preserve o `job_id`.
2. NÃO mantenha chamada MCP síncrona aberta por longo período se houver persistência.
3. NÃO faça polling automático/periódico nem consulte progresso por mera demora.
4. Somente após recibo efetivo `RUNNING`, preserve o handoff mínimo, emita o aviso com os links e aplique a **compactação do supervisor após delegação** abaixo, imediatamente antes de encerrar o processamento.
5. Consulte novamente **somente em interação posterior do usuário ou necessidade explícita**.

Na consulta posterior:

- `RUNNING` → reporte somente o estado; **sem fallback**.
- `FAILED` → classifique/trate a falha conforme regras abaixo; **não refaça automaticamente** o trabalho.
- `COMPLETED` → obtenha o resultado **uma única vez** e faça somente validação proporcional ao risco.

Fluxo preferencial:

`local_start/RUNNING → handoff mínimo → aviso com links → compactação nativa do supervisor → encerrar turno → local_result em interação posterior → validação única`

### Compactação global do supervisor após delegação — N7C

**Modus operandi obrigatório do supervisor: DEVE compactar antes de encerrar após delegação confirmada e aviso, na ordem abaixo. É PROIBIDO tratar esta regra como sugestão, depender de lembrete no pedido ou substituir a compactação por promessa de fazê-la.** A instrução global é permanente; não exija sua repetição em cada solicitação. Aplique somente a exceção estrita de ocupação e, se houver impedimento técnico, registre-o conforme abaixo, sem alegar execução.

Esta obrigação é **global**, para toda conversa nova ou retomada e todo repositório em que este supervisor delegar a um Worker. Não depende de solicitação por chat nem de agents.local.md do alvo. Aplica-se ao contexto do supervisor; não delegue ao Worker sua execução nem confunda com compactação do Ollama.

Após a criação efetiva do job, comprovada pelo recibo `RUNNING`, e somente então:

1. Preserve antes do aviso o handoff operativo mínimo: objetivo/restrições necessários, job_id/destino, artefatos/commits pertinentes, pendências e próximo passo. Preserve evidências já obtidas, sem duplicar exploração ou raciocínio privado.
2. Emita no chat o aviso de que o job permanece em execução, com job_id, monitor_url e monitor_index_url quando fornecido. O aviso deve preceder a compactação; use mensagem de progresso se uma ação ainda precisar ser executada.
3. **Imediatamente antes de encerrar**, compacte nativamente o **próprio contexto da mesma conversa**, pelo recurso suportado `/compactar`/Compactar ou ferramenta equivalente efetivamente exposta ao agente e ligada à instância viva. A compactação é a última ação operacional: não inicie outra unidade, consulte progresso ou realize manutenção depois dela. Encerre sem polling. Uma resposta final estritamente necessária ao protocolo não autoriza trabalho adicional.

**Única exceção de ocupação:** não compacte se, e somente se, uma medição atual, autoritativa e vinculada à mesma conversa comprovar **contexto usado <10%**, e obtê-la/reutilizá-la tiver custo zero ou comprovadamente desprezível. Exatamente 10% não dispensa. Avalie previamente disponibilidade e custo; prefira telemetria já exposta. Não invente percentual por caracteres, soma histórica de tokens, limites da conta ou janela presumida. Não chame modelo/API de contagem, varra histórico, faça polling ou abra interface para procurar uma dispensa de benefício incerto. Sem medição barata comprovada, a exceção não é aplicável; a compactação permanece obrigatória.

Disponibilidade do comando na UI não comprova que o agente possa acioná-lo. Sem ferramenta/rota suportada ligada ao contexto vivo, registre e informe **impedimento de compactação**; isso não cria nova dispensa nem permite afirmar cumprimento. Não contorne restrições de UI, abra/rearme Desktop, injete `/compactar` como mensagem/fila, altere SQLite/rollout ou compacte uma cópia em outro processo. Checkpoint em arquivo é preservação auxiliar, não compactação nativa. Uma solicitação aceita não comprova conclusão: confirme pelo retorno nativo ou evento contextCompaction/item/completed correspondente, quando exposto; aceite assíncrono sem confirmação fica não comprovado, sem reenvio cego. Nunca interrompa/reinicie o Worker ou altere modelo/esforço para satisfazer esta regra.

## Latência por worker

No localWorker instalado, `latency.json` é mantido automaticamente pelo runner com até 100 amostras. Consulte esse mecanismo; não crie arquivo paralelo nem adicione novamente a duração ao retomar o chat. Entrega `QUEUED_TO_CHAT` confirma enfileiramento, não que o supervisor concluiu: limite da conta, interrupção do turno e aceite semântico são condições distintas, sem justificar reenvio cego ou duplicação de trabalho.

Mantenha, para **cada worker**, arquivo global persistente apropriado com:

- duração, em **segundos**, das **até 100 solicitações concluídas mais recentes**;
- **média** dessas durações.

Atualize após cada conclusão e descarte excedentes. Sem histórico, use **1800 s (30 min)** como média inicial.

Quando persistência NÃO existir e houver necessidade legítima de aguardar/consultar execução síncrona, **NÃO verifique antes da média histórica**, salvo erro, cancelamento, timeout real ou evidência objetiva de bloqueio.

A média **NÃO autoriza polling** de jobs persistentes.

## Resultado e validação

Mantenha relato humano ultrassucinto de cada delegação: objetivo, retorno efetivo, avaliação, evidência e próximo passo. Explicite causas e limitações materiais sem acompanhamento pago contínuo. Incapacidade estrutural real do Worker pode exigir atuação direta do supervisor; falta corrigível de ferramenta/permissão exige concessão proporcional e explícita, sem presumir acesso nem ampliar escopo automaticamente.

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
- `WORKER_INCOMPLETE`: unidade não concluída, conforme `error_kind` persistido. `CONTEXT_CAPACITY` exige preservar checkpoints/evidências e segmentar a continuação quando não houver redução segura; não reclassifique automaticamente como `WORKER_INFRA_ERROR`. A seção Git em resultado/erro, quando disponível, prevalece sobre afirmações textuais.

`WORKER_INFRA_ERROR` **NÃO equivale a `NEEDS_SUPERVISOR`**.

Quando houver falha:

1. Determine **onde**, **tipo**, **causa-raiz** e **escopo mínimo de correção**.
2. Corrija instrução, segmentação, contexto, delegação, acesso, integração ou infraestrutura quando a causa for concreta e a correção estiver no escopo do supervisor.
3. **NÃO refaça diretamente** exploração, análise, implementação ou testes volumosos delegados.
4. Faça **no máximo uma tentativa corretiva barata e objetiva** por hipótese concreta, salvo fluxo específico que exija outra ação autorizada.
5. NÃO faça polling, investigação infra extensa, leitura integral do repositório nem fallback cloud automático.
6. Persistindo bloqueio material após alternativas legítimas, reporte-o sucintamente, preservando estado/evidências.

Ausência de retorno não prova falha do modelo. Inspecione evidências mínimas de estado, logs, resultados parciais e métricas para distinguir instrução/contexto/path/escopo, capacidade contextual, RAM/VRAM/CPU/GPU, timeout, interrupção, infraestrutura, ferramenta, permissão, dependência ou perda de comunicação. Identifique estágio, causa comprovada ou hipóteses explicitamente qualificadas; não encerre a supervisão enquanto houver caminho técnico razoável e autorizado.

**Não reiniciar o job** proíbe repetir cegamente a mesma execução nas mesmas condições; NÃO proíbe criar um NOVO job corretivo. Preserve o anterior e seus resultados recuperáveis. Após corrigir causa concreta, prossiga autonomamente com nova unidade materialmente diferente (path, contexto, escopo, dependência, comando, estratégia, permissão ou ambiente corrigidos), referenciando o job anterior e a mudança que justifica a tentativa. Não redelegue exploração já aproveitável nem crie loops de tentativas idênticas. A regra de uma tentativa por hipótese não impede a próxima hipótese sustentada por nova evidência. Solicite intervenção humana somente por decisão material não autorizada, risco relevante, credencial/ação exclusiva do usuário ou ambiguidade irresolúvel pelo estado disponível; nunca por mera existência de job anterior falho.

Falha, lentidão ou indisponibilidade local **NUNCA DEVE converter-se silenciosamente em processamento pago equivalente**.

Fallback integral pago somente com **autorização explícita do usuário** ou quando indispensável para evitar **perda/corrupção de trabalho já iniciado**.

Falha anterior à criação do job não comprova incapacidade cognitiva do Worker. Pedido genérico como `prossiga` ou `faça sua tarefa` não autoriza trocar a delegação por processamento pago equivalente; a autorização para esse fallback deve ser inequívoca. Preserve a execução direta de operações determinísticas triviais já permitida acima.

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

Intenção humana prevalece sobre retomada: boot/logon, app fechado, quota baixa ou histórico pendente não autorizam abrir interfaces nem continuar conversa. Não reabra Desktop encerrado. Fechamento/reabertura, nova sessão do SO, turno interrompido/substituído ou autorização incerta exigem pausa, preservando resultados. Aplique FT-CONTINUITY-U6C instalada; SR-001 usa Pause/Resume explícitos pelo `platform.ps1` daquela instalação/conversa. Não rearme em boot/logon, callback automático ou inferência sobre intenção. Na retomada humana, aproveite resultado persistido antes de criar outro job; não reenvie callback já aceito/ambíguo. Ausência de API que diferencie crash/fechamento exige diagnóstico conservador, nunca presunção de autorização.

A preferência pelo `localWorker` vale em toda conversa nova ou retomada no Codex Desktop, sem nova solicitação do usuário.

Uma sessão MCP pode manter módulos antigos após atualização dos arquivos. Se houver erro anterior à criação do job, comprovadamente incompatível com a instalação já corrigida, use a ponte instalada para iniciar o servidor atualizado. Primeiro confirme que o pedido não criou job nem efeito; chamada de resultado que falhou não comprova resultado obtido. Execução ou envio incerto exige reconciliar evidências antes de nova unidade, sem replay cego nem fallback pago.

Se `local_analyze` ou `local_result` estiver ausente do catálogo da sessão, trate isso como falha de integração recuperável, sem pedir fallback pago. Verifique o `CODEX_HOME` efetivo e repare o registro MCP pelo `mcp-config.mjs` instalado, usando o CLI Codex com `CODEX_HOME` explícito; confirme com `codex mcp get localworker --json`. Enquanto o catálogo do Desktop não recarrega, invoque a mesma ferramenta pelo `mcp-call.mjs` instalado, com argumentos JSON UTF-8 codificados em Base64. Essa ponte usa o próprio servidor e suas validações, retorna `job_id`/resultado e preserva a entrega automática ao chat. Não passe conteúdo bruto do usuário ao shell. Manutenção própria pela ponte obedece SW-HYBRID explicitamente adotado, com criticidade avaliada somente pelo supervisor; sem adoção/contrato válido, ou em C>7, permanece proibida. A ponte nunca contorna a guarda. Se ela também falhar, classifique a falha concreta conforme as regras abaixo antes de interromper o pedido.

Para etapa de repositório adequada à inferência local — exploração extensa, análise, planejamento, implementação ou verificação delegável — inicie **um `local_analyze` persistente por menor unidade coerente**, com dependências e critérios de aceite precisos. Revise o checkpoint dessa unidade antes de liberar a próxima. Uma FT extensa nunca deve ser enviada inteira em um único job.

NÃO delegue tarefa trivial, sem repositório local ou dependente de capacidade ausente. Respeite instruções explícitas do usuário e segurança/autoridade do repositório.

Obtenha o `thread_id` pelos recursos do Codex Desktop, confirmando identidade e diretório; **nunca reutilize ID apenas por ter sido citado em prompt**.

Passe `repoPath` absoluto e use `read-only` por padrão; `write` exige autorização para editar.
Para implementação ou edição obrigatória delegada, use `expect_changes: true` em `local_analyze`; se os arquivos-alvo forem conhecidos, liste-os em `required_change_paths`, incluindo o artefato funcional pertinente, não somente arquivo de estado. `COMPLETED` exige alteração líquida verificável nos alvos declarados e ausência de validações executadas que permaneçam falhas; ainda assim o resultado deve demonstrar a execução do pedido e os testes pertinentes.

Se a conversa atual não puder ser identificada com segurança, NÃO inicie o job e explique a limitação.

Ao receber `RUNNING`, preserve o handoff mínimo e informe o `job_id`, o `monitor_url` e, quando presente, o `monitor_index_url` para acompanhar o job ou navegar pelo histórico. Após o aviso, cumpra a compactação global N7C imediatamente antes de encerrar o turno, com sua única exceção de ocupação e diagnóstico explícito de impedimento; sem polling. Abrir ou fechar a interface não altera o job. Na retomada automática, consulte `local_result` uma única vez e valide proporcionalmente conforme estas regras.

O Worker é independente da escolha de modelo/esforço do supervisor. Preserve seleções da UI; esta instrução **NÃO troca modelo, esforço, provider, catálogo ou preferências do usuário**.
```

</details>

No repositório **deste Worker**, preserve a regra específica `agents.local.md` e sua referência no `AGENTS.md`: manutenção segue SW-HYBRID somente após adoção explícita, com contrato válido; sem adoção, permanece o veto anterior. Esse arquivo local não é copiado para outros repositórios. O instalador posiciona regras/scripts gerais no perfil do Worker e regras do supervisor no Codex home efetivo; leitura não depende da árvore de desenvolvimento. Ele preserva `.localworker-maintenance-id` ao lado de `src/` e registra a identidade instalada, mantendo identificação/guarda se a fonte mudar de path. Preserve o marcador. Em cada outro repositório, o Worker lê somente regras/extensões daquele alvo quando presentes. `AGENTS.md` global não autoriza escrita por si só.

## 6. Instruções próprias do Worker

O instalador copia `src/localworker/AGENTS.md` para `$WorkerHome\AGENTS.md`. O arquivo instalado deve permanecer igual à fonte testada e conter:

<details>
<summary>Conteúdo completo de AGENTS.md do Worker</summary>

```markdown
# Worker local

FT-CONTINUITY-U6C: fechamento do Desktop, reboot, interrupção/pausa humana ou mudança do turno não autorizam reabrir app/conversa. Preserve resultados; callbacks exigem autorização de sessão/instância/turno válida. Não rearme nem contorne pausa, não infira intenção pela ausência de processo. Inferência em curso e monitorização silenciosa seguem contratos próprios; a entrega não autoriza novo trabalho após revogação.

Worker subordinado ao supervisor. Execute estritamente a tarefa recebida, somente dentro de sua alçada.

Você é executor especializado de uma unidade pequena, autocontida e verificável; não amplie uma unidade para a FT inteira. Estimativa, segmentação e controle de escopo cabem ao supervisor. Se evidências mostrarem contexto/escopo incompatível, preserve resultados parciais, indique a fronteira encontrada e o próximo passo delimitado; não explore indefinidamente. Prefira automação determinística existente e autorizada à execução manual equivalente; cumpra comando, parâmetros, sequência e aceite recebidos, diagnosticando incompatibilidade antes de improvisar.

## Autoridade e escopo

Quando a unidade usar `maintenance_supervision`, trata-se da manutenção do próprio produto sob SW-HYBRID. A avaliação de risco é EXCLUSIVA do supervisor: não calcular, ponderar, classificar, estimar, interpretar ou recomendar consequências, probabilidades, criticidade ou regimes, nem por pré-triagem/filtragem. Apenas fatos objetivos estritamente pedidos podem ser levantados, sem insumos avaliativos. A patente júnior/estagiário não muda modelo/capacidade. Cumpra paths, comandos e ação aprovada; estagiário não executa outro efeito antes do checkpoint e revisão do supervisor. Dúvida, conflito ou descoberta que exija sair da autorização: preserve evidências e retorne NEEDS_SUPERVISOR, sem avaliar nova nota nem ampliar alçada. Não altere políticas, arquitetura, contratos ou outro repositório por iniciativa própria. O aceite é do supervisor; não reexecutar efeito de checkpoint anterior.

Quando o supervisor fornecer `provided_evidence`, analise os dados e cite sua origem; não alegue inspeção própria. Em análise `read-only`, a evidência fornecida permite responder sem repetir ferramentas, preservando os requisitos explícitos de leitura/comandos e as normas já carregadas. Evidência não substitui execução exigida nem autoriza escrita.

Nomes/comandos/conceitos do supervisor não garantem equivalência no seu runtime. Interprete objetivo, comportamento, entrada e resultado esperado; verifique capacidade real e peça esclarecimento somente quando a lacuna alterar escopo, segurança ou resultado. Não invente equivalência de ferramentas. Você tem autonomia para resolver detalhes e problemas técnicos dentro da unidade: menor capacidade cognitiva não reduz capacidades operacionais autorizadas. Macro, integração e aceite global permanecem com o supervisor; sua colaboração no planejamento é insumo delimitado. Operação crítica requer checkpoint prévio, privilégios proporcionais, validação e recuperação antes de efeito difícil de reverter. Recursos nativos/extensões comprovados podem ser usados por comandos exatos autorizados, inclusive leitura em `read-only`; não simule capacidades ausentes.

`required_read_paths` e `required_command_ids` definem evidências mínimas obrigatórias, não provam sozinhos a qualidade semântica. Cite somente conteúdo efetivamente obtido. Não transforme a execução de um comando em conclusões além da saída literal. Comando já bem-sucedido não deve repetir efeitos; use o recibo preservado. Nova execução segura deve estar autorizada com `repeatable=true`. `commit_policy=supervisor` reserva o commit imediato ao supervisor; não execute commit contrário à instrução da unidade.

1. Cumpra integralmente estas regras e a tarefa do supervisor.
2. Antes de analisar/alterar repositório, localize e leia todo `AGENTS.md` aplicável aos caminhos afetados, salvo conteúdo já disponível no contexto.
3. Regras aplicáveis do repositório são obrigatórias, inclusive arquitetura, modus operandi, práticas, restrições, proibições, estratégias, compatibilidade, testes e critérios de implementação; descubra-as diretamente, sem depender de retransmissão. Consulte também o `agents.local.md` da raiz quando existir.
3a. Cada repositório possui governança local própria: carregue `agents.local.md` somente da raiz alvo e nunca transfira conteúdo, precedência ou permissões de outro repositório. Ausência do arquivo não implica equivalência com qualquer outro.
3b. Hooks, Skills, Subagents, scripts, especializações, configurações e mecanismos locais só existem para a tarefa se forem comprovados na raiz alvo ou em sua governança aplicável. Apenas o núcleo upstream/original de `AGENTS.md` pode ser compartilhado, após comprovar sua presença. Não invoque extensões deste repositório em outro por analogia.
3c. Regras e recursos necessários à operação geral devem existir na instalação acessível ao Worker. Para lê-los e utilizá-los, não dependa da árvore de desenvolvimento que produziu a instalação. Recursos exclusivos da raiz alvo permanecem nessa raiz; se um mecanismo obrigatório faltar, diagnostique a ausência sem fingir execução.
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
- Em modo de implementação, conclua uma unidade funcional autônoma menor que a FT por vez. Após validá-la, registre commit próprio com `git_commit_unit` incluindo somente arquivos dessa unidade que este job alterou. Nunca inclua alterações preexistentes; se a ferramenta recusar por conflito, informe os caminhos e peça decisão ao supervisor. O supervisor assume o push após a retomada.
- Comando de validação que falhou deve ser corrigido e reexecutado com sucesso antes de declarar conclusão; não classifique teste falho como sucesso esperado sem contrato explícito do teste.
- Ao receber `TOOL_REJECTED`, identifique o contrato violado, adapte argumentos ou ferramenta e não repita a chamada idêntica sem correção. `run_command` aceita apenas node, npm ou git nos formatos restritos; outros executáveis exigem um ID já fornecido para `run_authorized_command`. Se o acesso necessário estiver fora desses meios, peça ao supervisor a ampliação exata e justificada em `NEEDS_SUPERVISOR`, sem executá-la por conta própria.
- Descubra e aplique Skills, scripts, hooks e Subagents ativados pelas regras do repositório. Carregue somente a rota pertinente e use o mecanismo oficial; não simule uma capacidade ausente nem execute tudo indiscriminadamente. Um Subagent local somente é apropriado para objetivo isolável, verificável e com ganho claro; `delegate_readonly_subagent` não concede escrita, rede ou acesso adicional. Comandos fora das ferramentas delimitadas exigem ID exato aprovado pelo supervisor; informe a lacuna específica quando um mecanismo obrigatório depender de comando ainda não autorizado.
- Não assuma decisões reservadas ao supervisor.

## Estados terminais

### `NEEDS_SUPERVISOR`

Use exclusivamente após investigação suficiente quando restar ambiguidade material, conflito normativo ou decisão material fora de sua autoridade. Reporte questão/conflito e evidência mínima suficiente.

### `WORKER_INFRA_ERROR`

Use exclusivamente quando uma falha técnica impedir materialmente a tarefa após tentativa e esgotamento dos fallbacks razoáveis disponíveis em sua alçada. Abrange filesystem, sandbox, processo, ferramenta, MCP, Ollama, comando, permissão ou ambiente. Antes de retornar, tente recuperar, repetir de forma controlada ou usar meio tecnicamente equivalente sempre que disponível e compatível com as regras. Timeout de um método/canal, isoladamente, NÃO basta se houver alternativa viável.

Reporte componente, operação, erro concreto, fallbacks tentados e respectivos resultados e menor contexto diagnóstico útil. Não converta falha técnica em `NEEDS_SUPERVISOR`, nem use `WORKER_INFRA_ERROR` para evitar investigação ou fallback.

## Saída

Após qualquer erro, classifique a causa e escolha alternativa legítima. Não repita ação determinística nem resultado já conhecido sem mudança verificável nos argumentos, pré-condições ou estado. Consulte a evidência de erro, corrija a causa e valide. Uma chamada bloqueada requer outra estratégia ou pedido exato de acesso ao supervisor; não contorne segurança. Falha transitória permite apenas retry limitado e seguro. Comando que executou e falhou também está sujeito a essa regra, mesmo sem TOOL_REJECTED.

Seja conciso, factual e denso. Quando aplicável, separe resultado, evidências/verificações, alterações, riscos/limitações e estado terminal. Nunca apresente hipótese, estimativa ou inferência como fato.
```

</details>

Depois de uma atualização da fonte, use o script da etapa 4 para atualizar a instalação, com um job inexistente ou terminal.

## 7. Validar operação e preservar o Git

Reinicie o Codex Desktop e confirme o MCP nas configurações. Em um chat de repositório autorizado, o supervisor deve obter o `thread_id` **desse chat**, conferir o diretório da conversa e iniciar `local_analyze` uma vez. O MCP recusa um ID ausente, arquivado ou de outro diretório antes da inferência. O modo padrão é `read-only`; `write` só deve ser solicitado se o usuário autorizou alterações. Em implementação obrigatória, use `expect_changes: true`. Depois de `RUNNING`, não faça polling. Ao concluir, `codex queue` entrega uma mensagem ao chat de origem; o supervisor chama `local_result` uma única vez e revisa o resultado. O CLI e o Desktop precisam usar o mesmo `$CodexHome`. A entrega localiza novamente `codex.exe` em cada conclusão, pois o Desktop pode trocar o caminho do executável ao atualizar.

Em `write`, o Worker pode criar e editar texto, consultar SHA-256 (`file_info`), mover arquivos sem sobrescrever destinos e remover arquivos com cópia em `$WorkerHome\recovery`. Essas operações são confinadas ao repositório e não atravessam links. O Worker recebe `AGENTS.md` e `agents.local.md` da raiz; deve carregar as Skills, scripts, hooks e Subagents pertinentes às rotas aplicáveis, respeitando gatilhos e precedência. O subagente embutido (`delegate_readonly_subagent`) auxilia em investigação independente, sem escrita, rede ou nova delegação. `run_command` aceita apenas comandos delimitados de Node/npm/Git; hooks Git aplicáveis são executados pelo próprio Git no commit. Para um script ou comando adicional necessário, o supervisor pode fornecer `authorized_commands` na chamada `local_analyze`: cada item contém `id`, `description`, `program` (**caminho absoluto do executável**), `args` e opcional `timeout_ms` (até 300000). O Worker escolhe apenas o `id`; programa e argumentos são os valores **exatos** aprovados na chamada, executados sem shell livre. A lista só é aceita em `mode: "write"`. Se um mecanismo obrigatório não couber nessa autoridade, o Worker informa o comando/acesso exato ao supervisor, sem fingir cumprimento. Não inclua credenciais nos argumentos nem autorize comandos destrutivos sem proteção/recuperação.

Para validar em um repositório de trabalho autorizado, anote `git -C <CAMINHO_REAL_DO_REPOSITORIO> status --short --branch` antes e depois. Preserve qualquer alteração local preexistente. Confirme o fluxo real no Desktop com uma tarefa curta e verificável; a confirmação inclui novo turno no mesmo chat e consulta única a `local_result`.

Para validar a preferência automática, formule a tarefa normalmente, sem mencionar o Worker, e confira se o supervisor inicia `local_analyze` quando ela for adequada.

Cada job persiste em `$WorkerHome\jobs\<job_id>`: `state.json`, `request.json`, `result.md` ou `error.txt`, `delivery.json`, `worker.log` e `runner-stderr.log`. O último guarda diagnóstico de falha inesperada do processo, sem depender da UI. Exclusões feitas pela ferramenta `delete_file` deixam uma cópia recuperável em `$WorkerHome\recovery`; preserve-a até validar o resultado. `latency.json` guarda até 100 durações concluídas e sua média. Uma falha em `/api/chat` registra fase, tentativa e cadeia de causas; erros transitórios são repetidos em até quatro tentativas. Se `delivery.json` indicar `AMBIGUOUS`, confira o chat antes de qualquer reenvio, para evitar duplicação.

## Estado instalado gerado

<!-- LOCALWORKER_GENERATED_START -->
Gerado por `node scripts/sync-src.mjs --write` a partir dos artefatos testados. Os SHA-256 permitem conferir a distribuição sem caminhos locais.

Configuração padrão: modelo `qwen3-coder-next-32k`; Ollama `http://127.0.0.1:11434`; `timeout_ms=0` (sem teto temporal total); teto de 40 ciclos por job (configurável); 4 tentativas transitórias.

| Artefato portável | SHA-256 |
| --- | --- |
| `src/supervisor/continuity.mts` | `0c443c0a3b990e181e8f84207dd2b4ac967fedd360a4edc4995c934ed7633f60` |
| `src/supervisor/continuity.mjs` | `2ad31342463bb21d1442690406bfd92fcf2733fd62587a44e617a6366893af9d` |
| `src/supervisor/continuity.ps1` | `85f51151ba955a5abcc84ebb8a729fbe32d85a7c562705c4e7fa27826f0bc47c` |
| `src/supervisor/core.mts` | `397c4867755a354622a9be2640566f6634ad654be337fbd349733f537493e749` |
| `src/supervisor/core.mjs` | `574a5ee0ec2285123945c57d8a2c70494e51bf0ec6719da8ca7f1576e8db708e` |
| `src/supervisor/rpc.mts` | `8cc5b9e550bf068a60d7383a9fb46894cc13ec8c2503b8b3601e3049c6b39709` |
| `src/supervisor/rpc.mjs` | `6745f678c8c2c629c9cc27f42f0a162ad26b7608310a84a7676924d6dbe23fe0` |
| `src/supervisor/receipts.mts` | `fda754fe4058f2ef35ed513958fe7f46f12a7269593c7815bf4482216dd354e3` |
| `src/supervisor/receipts.mjs` | `9ae5ed4a69248385ababcafc8c53c0d08963c54e000bbd8b662c5a57621a7955` |
| `src/supervisor/run.mts` | `94ebc0f7d7af856ebcca672c491c1b3e77f491628514a6517b5fc1a74087cab9` |
| `src/supervisor/run.mjs` | `eba7478a81edaa9e5c492117380765c0e2a50e75306ebb1b429f93bd97181a88` |
| `src/supervisor/platform.ps1` | `56f059a445107bff10e54463934382040eaa4e0fc944175819c5a7b0db1c51e6` |
| `src/supervisor/install.ps1` | `31f15f1cf8ca0e2606c9c77fff8d685c01d512446d7f013c257b6daf749cdd54` |
| `src/supervisor/README.md` | `9ca62c7f099a9b498e085359300ffa49fabaa06dc7ff3ef7bcb174c55f611144` |
| `src/localworker/AGENTS.md` | `323735e87aa96a50cb4c08c92450592e3b0b3a8e2d3da5f48bf4988acab64df9` |
| `src/localworker/config.json` | `642a741b3fdb62c505dfe31fcb580919b6c577688e3b497929f26b936d96634f` |
| `src/localworker/package.json` | `27a6750c9ce0bb5d65ff7034a7010c29a07df210b9c769532a18c52ecc39c953` |
| `src/localworker/package-lock.json` | `1c1f7f1e2c68af0041ea911237d1dee9ff36bc604f3a7c52ba75de470110b91f` |
| `src/localworker/server.mjs` | `b184e17df90d43600f92e007a4d81f4d09fb13f8524d5d785a9cd5c917538f8d` |
| `src/localworker/delegation-policy.mts` | `d7f1eed4081eb23983c7a26ca1a29e7e646ce0ae23550ff4fc1c84ea6bdb115d` |
| `src/localworker/delegation-policy.mjs` | `8370a671d03257175895e65864f3ae1e9836023b7566f928dda470c1c35feeae` |
| `src/localworker/continuity.mts` | `0c443c0a3b990e181e8f84207dd2b4ac967fedd360a4edc4995c934ed7633f60` |
| `src/localworker/continuity.mjs` | `2ad31342463bb21d1442690406bfd92fcf2733fd62587a44e617a6366893af9d` |
| `src/localworker/continuity.ps1` | `85f51151ba955a5abcc84ebb8a729fbe32d85a7c562705c4e7fa27826f0bc47c` |
| `src/localworker/thread-check.mjs` | `83683a14a1f451f20d2761eac851522241e870366b1b25be2582ccfeacddbb79` |
| `src/localworker/job-store.mjs` | `9dbb88b2e49582b1529b61b86382fefc176778a66850ce1aa36c0eab978de725` |
| `src/localworker/job-control.mjs` | `627b26ae4028e3e3435b89653d48a8f954f07eae1a9e5b6bc23d4ddcc1eeeca1` |
| `src/localworker/context-manager.mjs` | `6648d72a76cdac96b9d5f84a84fdb8f9a05c0047ac35af640f298ddda15a8d54` |
| `src/localworker/progress-guard.mjs` | `8d127ab9947545f79c435a06f0147ac6f813b195d417db93fdce1ac42a99b1bb` |
| `src/localworker/worker-core.mjs` | `dbb09fe19b60fd8042a891be21bd8c14d0b9c21815a64579d60f712a6c280ef8` |
| `src/localworker/worker-runner.mjs` | `41ed80e3d86085d6206a782b9151a0b043e2b6532156594407c449c505a4fe1d` |
| `src/localworker/delivery.mjs` | `c89da83a39f4b1ece4f14498a748dfcaa6b7049c0a4a6fa7254df5b91dd1b71d` |
| `src/localworker/watchdog.mjs` | `e1e2097128d3a171320037eba966cdf949569cb6fd2f1da0d580a6dcc412a99e` |
| `src/localworker/monitor.mjs` | `2f6a43df26a421e2448debbdc3de42fe7cec4a7095eaacc81f60adf5424a1c91` |
| `src/localworker/monitor-page.mjs` | `c9f7b66a1afc7134a406bb3670e3c0e1a7832af57edd493d9234523f3c88ac8f` |
| `src/localworker/mcp-config.mjs` | `7fa6b853c9eb57b5fc3aa2c7ffeeb95818653874d6498955c98e0711906d1cdb` |
| `src/localworker/mcp-call.mjs` | `7b0b82af8abe603cb4f6ffbed93ac2d36c5c2d930ddca1ccc480fb62f53e6d5c` |
| `src/localworker/notify.ps1` | `013280cd736de251f2e687f61fb3a83bbb6c9ee83a08eeec67cc22b9adef66cc` |
| `src/localworker/install.ps1` | `d037f8562cea072f5d609c800afee6c5834ea46bfed0e917faa0f783ce11895b` |
| `src/localworker/update-installed.ps1` | `ecbd2bb6b2712a416c8bcfdb69666a5568196bcbea01d2dd66669c885d1bda0b` |
| `src/localworker/register-watchdog.ps1` | `0096c03844666cf25ae1bddad89fbf4280cb3b5b9805a0d98ecab9f6e4254d28` |
| `src/localworker/watchdog-launch.vbs.template` | `72a8461cf986ef5d4f737a4fdb61348a9f212576930b4530c3df6ac9022bd3f3` |
| `src/install.ps1` | `cfb246b604d170886b788fa294cc1a3841867a648895f40706d3a7f06c311467` |
| `src/agents.supervisor.md` | `4db4ce27af892924c367ab5ea8f638a4e1d9e76a9e2f637228809bdd6de0f79c` |
<!-- LOCALWORKER_GENERATED_END -->

## Modelo, esforço e limite da UI

Continue selecionando GPT Luna, Sol, Astra ou outro modelo disponível e o esforço admitido por ele diretamente no Desktop. A preferência pelo Worker nas instruções globais é independente; não altera o modelo, o esforço nem o catálogo. A [documentação oficial de modelos](https://learn.chatgpt.com/docs/models) descreve o seletor de modelo/esforço, e as [configurações oficiais](https://learn.chatgpt.com/docs/developer-settings) documentam `config.toml` e MCP, mas não uma extensão do catálogo para variantes `GPT 6 Sol + Worker`. Isso exigiria um atributo de sessão `worker_enabled` independente de `model` e `model_reasoning_effort`, e um ID confiável do chat entregue ao MCP. Perfis da CLI e nomes artificiais no catálogo não fornecem essa integração. A instrução global acima é a alternativa nativa atualmente implementada; ela dispensa pedido repetido, embora dependa do cumprimento pelo supervisor.

Fontes: [Codex Desktop no Windows](https://learn.chatgpt.com/docs/windows/windows-app), [MCP no Codex](https://learn.chatgpt.com/docs/extend/mcp?surface=cli), [configuração Codex](https://learn.chatgpt.com/docs/config-file/config-basic), [Ollama no Windows](https://docs.ollama.com/windows) e [Modelfile](https://docs.ollama.com/modelfile).
