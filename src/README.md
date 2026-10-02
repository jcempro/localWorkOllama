# Artefatos portáveis

`install.ps1` é a entrada para Windows 11 2025H2+. `localworker/` contém os arquivos que serão instalados no perfil escolhido. `agents.supervisor.md` define o bloco global do Codex; `agents.worker.md` espelha as regras instaladas do Worker. O runtime testado reside em `../localworker/`; `../scripts/sync-src.mjs` gera os espelhos e verifica sua equivalência antes de cada commit.

`localworker/mcp-config.mjs` registra e revalida o MCP pelo CLI do Codex, com backup. O instalador e o atualizador o executam; o watchdog agendado restaura um registro perdido. `codex_config` no `config.json` instalado aponta para o arquivo efetivo, descoberto a partir de `-CodexHome`/`CODEX_HOME`.

`localworker/mcp-call.mjs` é a ponte de emergência para chats cujo catálogo já nasceu sem MCP. Recebe nome de ferramenta e objeto JSON UTF-8 em Base64; invoca o mesmo `server.mjs` via stdio e encerra apenas o transporte após a resposta. Não altera a duração do job persistente.

## Valores substituíveis

| Valor | Origem e configuração |
| --- | --- |
| Pasta da distribuição | Localização deste `src/`; descoberta pelo instalador. |
| Destino do Worker | `-WorkerHome` ou `LOCAL_WORKER_HOME`; padrão derivado do perfil do usuário. |
| Diretório/configuração Codex | `-CodexHome` ou `CODEX_HOME`; arquivo `config.toml` derivado. Para regras globais, o instalador usa `AGENTS.override.md` se existir, senão `AGENTS.md`, preservando conteúdo não gerido. |
| Sobrescrita da base Codex para entrega/consulta | `LOCAL_CODEX_HOME`; padrão `CODEX_HOME` ou perfil atual. |
| Executáveis Git, Node, npm, Ollama e Codex | `-GitExe`, `-NodeExe`, `-NpmExe`, `-OllamaExe`, `-CodexExe` ou descoberta no PATH/instalação. |
| Modelo Ollama e base | `-WorkerModel`/`LOCAL_MODEL`; `-BaseModel`/`LOCAL_BASE_MODEL`; padrões em `config.json` e no instalador. |
| Janela do modelo | `-ModelContextTokens` no instalador; padrão 32768 tokens. |
| URL Ollama | `OLLAMA_URL` ou `config.json:ollama_url`; prefixo de caminho de proxy é preservado. |
| Timeout, passos e tentativas | `LOCAL_WORKER_TIMEOUT_MS`, `LOCAL_WORKER_MAX_STEPS` (inteiro positivo; padrão 40 ciclos por job), `LOCAL_OLLAMA_ATTEMPTS` ou `config.json`. O teto de ciclos protege a janela de contexto e não é prazo total. |
| Orçamento de CPU | `LOCAL_WORKER_CPU_THREADS` ou `config.json:cpu_threads` (`auto`); mesmo valor explícito é limitado a preservar ao menos 25% dos processadores lógicos. |
| Reserva de RAM | 10% da RAM física ou 4 GiB, o maior. Sob pressão, o runtime espera até 120 s (`RESOURCE_WAIT_LIMIT_MS_R8N`), tenta descarregar seu modelo carregado após 30 s (`RESOURCE_RELEASE_DELAY_MS_R8N`) ou imediatamente se houver menos de 4 GiB livres, e concede nova janela de até 120 s após liberação comprovada; preserva a reserva e diagnostica o esgotamento. Limites ficam no topo de `worker-core.mjs`. |
| Reserva de VRAM | `LOCAL_WORKER_GPU_RESERVE_BYTES` no instalador e runtime. O runtime exige pelo menos 512 MiB ou 10% da GPU NVIDIA livres antes de inferir; após pressão, descarrega o modelo e ajusta `num_gpu` para a próxima chamada. A calibração fica em `jobs/gpu-policy.json`, expira após sete dias e é ignorada se a memória disponível mudar materialmente. O instalador contabiliza pelo menos 512 MiB ou 20% da menor GPU NVIDIA em `OLLAMA_GPU_OVERHEAD` como estimativa de carga, preservando valor preexistente maior. Se Ollama já estiver em execução, reinicie-o após `ollama_restart_required_for_gpu_reserve=true`. |
| Retenção do modelo na memória | `LOCAL_OLLAMA_KEEP_ALIVE` ou `config.json:ollama_keep_alive`; padrão `2m`, para liberar RAM/VRAM após ociosidade. |
| Resposta HTTP Ollama | Limite de 32 MiB centralizado no topo de `worker-core.mjs`; sem prazo por padrão; prazo total positivo somente por configuração explícita. |
| Regras do Worker | `LOCAL_WORKER_RULES`; padrão `AGENTS.md` instalado. |
| CLI de entrega | `LOCAL_CODEX_CMD`, `CODEX_CLI_PATH` ou `config.json:codex_command`, com redescoberta no PATH/Desktop. |
| Pré-argumentos do CLI | `LOCAL_CODEX_PREARGS_JSON`; somente cenários controlados. |
| Pasta de jobs, recuperação e latência | Derivadas do diretório instalado; não editar manualmente. |
| Recuperação de anomalias | `-WatchdogIntervalMinutes` ou `-IntervalMinutes` no registro da tarefa; padrão 2 minutos. A conclusão normal chama `codex queue` diretamente, sem aguardar esse intervalo. |
| Retenção do histórico | `LOCAL_WORKER_HISTORY_DAYS` (90), `LOCAL_WORKER_HISTORY_MAX_JOBS` (500), `LOCAL_WORKER_HISTORY_MAX_BYTES` (536870912) e `LOCAL_WORKER_HISTORY_MAX_TOTAL_JOBS` (1000). A limpeza verifica a cada 6 h e só remove jobs terminais com entrega `QUEUED_TO_CHAT`; jobs ativos, pendentes e ambíguos são preservados. Ao chegar ao teto total, tenta limpar elegíveis e, se persistir, impede novo job com diagnóstico. |
| Log operacional por job | `MAX_AUDIT_LOG_BYTES_K9P` (2 MiB) e `AUDIT_LOG_TAIL_BYTES_K9P` (1 MiB) no topo de `worker-runner.mjs`; compactação registra o evento e preserva a cauda recente, sem afetar resultado/estado. |
| Limites da UI/API | `MAX_EVENTS_M7Q` (2000 eventos recentes por detalhe), `MAX_LIST_LIMIT_M7Q` (100 linhas por resposta), `PAGE_LIMIT_M7Q` (50 linhas por página); constantes no topo de `monitor.mjs`/script de `monitor-page.mjs`. Se houver mais eventos que o limite, a timeline mostra os mais recentes em ordem cronológica. |
| Tempos de observação | `STALE_HEARTBEAT_MS_M7Q` (90 s), `WAIT_MODEL_MS_M7Q` (180 s), `WATCHDOG_INTERVAL_MS_M7Q` (60 s), `DETAIL_REFRESH_MS_M7Q` (3 s), `INDEX_REFRESH_MS_M7Q` (10 s), carência de órfão `ORPHAN_GRACE_MS_W8K` (120 s). Alterar somente com validação proporcional e atualização do guia. |
| Nome da tarefa agendada | `-WatchdogTaskName` no instalador ou `-TaskName` no script de registro; padrão `CodexLocalWorkerWatchdog`. |
| Lançador invisível do watchdog | `watchdog-launch.vbs.template` contém o modelo portável; `register-watchdog.ps1` substitui `__NODE_EXECUTABLE__` e `__WATCHDOG_SCRIPT__` pelos paths descobertos e gera `watchdog-launch.vbs` no destino. A tarefa chama `wscript.exe //B //Nologo`. Windows Script Host é componente do Windows 11. |
| Identidade do repositório que mantém o Worker | `-MaintenanceRepo` nos scripts internos ou `LOCAL_WORKER_MAINTENANCE_REPO`; padrão descoberto pela raiz Git da fonte, sem caminho fixo. |
| Configuração Codex dos scripts internos | `-CodexConfig`; padrão `CODEX_HOME/config.toml`. |
| Destino e executáveis nos scripts internos | `-Target`, `-NodePath`, `-NpmCommand`, `-CodexCommand`; o instalador principal calcula e passa esses valores. |
| Recursos opcionais do instalador | `-SkipPrerequisites`, `-SkipModel`, `-SkipWatchdog`, `-SkipGlobalRules`; apenas para instalação parcial/controlada. |
| Download de modelos Ollama | `OLLAMA_MODELS` conforme configuração oficial do Ollama. |
| Remoção de notificações | `LOCAL_DISABLE_NOTIFY=1` para testes sem balão. |
| Monitor local | `monitor_url` abre o detalhe; `monitor_index_url`, `local_monitor` ou `node monitor.mjs index` dão acesso ao inventário. Host `127.0.0.1`, porta primária `49767` e fallback `49768`, chave aleatória em `monitor.json` no destino. Não publique os links. Limites de heartbeat/espera e reconciliação de anomalias (60 s) estão no topo de `monitor.mjs`; carência de órfão (120 s) no topo de `watchdog.mjs`. A UI atualiza sem reload em 3 s no detalhe e 10 s no inventário enquanto visível. |
| Alvos obrigatórios de escrita | `required_change_paths` em `local_analyze`, lista de caminhos relativos; cada alvo deve mudar durante o job. Use com `expect_changes=true`. |
| Descoberta de aplicativos | `PATH` e `LOCALAPPDATA`, fornecidos pelo Windows; redescobertos no momento da entrega. |
| Origem do App Installer | URL oficial `https://aka.ms/getwinget`, família Windows `Microsoft.DesktopAppInstaller_8wekyb3d8bbwe` e produto Microsoft Store `9NBLGGH4NNS1`; definidos uma vez no topo do instalador. |
| Pacotes WinGet | `Git.Git`, `OpenJS.NodeJS.LTS`, `Ollama.Ollama` e produto Desktop `9PLM9XGG6VKS`; definidos uma vez no topo do instalador. |
| Notificação Windows | `-Title`, `-Body`, `-Kind` são recebidos do Worker; `-Kind` aceita `info` ou `error`. |

O instalador não recebe tokens nem os grava. Valores da máquina são calculados em execução e ficam fora desta árvore.

<!-- LOCALWORKER_GENERATED_START -->
Gerado por `node scripts/sync-src.mjs --write` a partir dos artefatos testados. Os SHA-256 permitem conferir a distribuição sem caminhos locais.

Configuração padrão: modelo `qwen3-coder-next-32k`; Ollama `http://127.0.0.1:11434`; `timeout_ms=0` (sem teto temporal total); teto de 40 ciclos por job (configurável); 4 tentativas transitórias.

| Artefato portável | SHA-256 |
| --- | --- |
| `src/localworker/AGENTS.md` | `444e7a9ba5345c6be31acc7696fd36cd8966edbdbf9e14495d0ff1f0326286e3` |
| `src/localworker/config.json` | `6147e1cfe3ef123def81c529b9d8b30f7771834ff15bf7333bbd1704ce96d1aa` |
| `src/localworker/package.json` | `27a6750c9ce0bb5d65ff7034a7010c29a07df210b9c769532a18c52ecc39c953` |
| `src/localworker/package-lock.json` | `1c1f7f1e2c68af0041ea911237d1dee9ff36bc604f3a7c52ba75de470110b91f` |
| `src/localworker/server.mjs` | `80e9d2fd7fa3b4e8c5294842ca1c03001516c9682dba9d5bb3957177cb69f9bf` |
| `src/localworker/thread-check.mjs` | `83683a14a1f451f20d2761eac851522241e870366b1b25be2582ccfeacddbb79` |
| `src/localworker/job-store.mjs` | `45654c33a7955d24fa38cc083c7691f01c1af48a6116a581ceb1108287fc4672` |
| `src/localworker/job-control.mjs` | `cdd652655c67d09684bfdff38b5bb9e3876967f2da8efaed354f34f506494910` |
| `src/localworker/worker-core.mjs` | `d34f43361e416a53651181a23655c497856446926fb31500f0c4a548f314d4eb` |
| `src/localworker/worker-runner.mjs` | `73eb23cbb58c014c0c1d93b69426504bd43e446284cbb5be6aa527bee50f0e15` |
| `src/localworker/delivery.mjs` | `9a75f7eea30055efcf5d1faa06f6e78dbdfc8fdef55435010890031ab45eeaf1` |
| `src/localworker/watchdog.mjs` | `9f9ccd116a57149c50342fcb3e7a6a703afdbc0d0557a021450283c4c98bb9e2` |
| `src/localworker/monitor.mjs` | `c0708bfb84fea0a0bdc5110d3467549e642fd1833aa27c20a89c636b7b56e6be` |
| `src/localworker/monitor-page.mjs` | `30fad505978bb67e49845d07c7cc3aeefefe237f2d52f636d3c09d9894b0933f` |
| `src/localworker/mcp-config.mjs` | `7fa6b853c9eb57b5fc3aa2c7ffeeb95818653874d6498955c98e0711906d1cdb` |
| `src/localworker/mcp-call.mjs` | `7b0b82af8abe603cb4f6ffbed93ac2d36c5c2d930ddca1ccc480fb62f53e6d5c` |
| `src/localworker/notify.ps1` | `013280cd736de251f2e687f61fb3a83bbb6c9ee83a08eeec67cc22b9adef66cc` |
| `src/localworker/install.ps1` | `6791f67b0c26ba2e50b96b0d176363d748b708e804bf84378cf99e724e83e97d` |
| `src/localworker/update-installed.ps1` | `e2d7521b4c4e6b67a88731566da82c416cf22cb61941c8ad4428ba875aa9b4e4` |
| `src/localworker/register-watchdog.ps1` | `0096c03844666cf25ae1bddad89fbf4280cb3b5b9805a0d98ecab9f6e4254d28` |
| `src/localworker/watchdog-launch.vbs.template` | `72a8461cf986ef5d4f737a4fdb61348a9f212576930b4530c3df6ac9022bd3f3` |
| `src/install.ps1` | `8236c3d99849796883031c16bcf86e2139efd0194ca2cbd4a4a9607d001ec670` |
| `src/agents.supervisor.md` | `d8a0783e9ae1b04c78b3dc03eb4159dd8ab0cca903086816a4a7d6ef461b8136` |
<!-- LOCALWORKER_GENERATED_END -->
