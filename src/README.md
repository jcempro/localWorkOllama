# Artefatos portáveis

`install.ps1` é a entrada para Windows 11 2025H2+. `localworker/` contém os arquivos que serão instalados no perfil escolhido. `agents.supervisor.md` define o bloco global do Codex; `agents.worker.md` espelha as regras instaladas do Worker. O runtime testado reside em `../localworker/`; `../scripts/sync-src.mjs` gera os espelhos e verifica sua equivalência antes de cada commit.

## Valores substituíveis

| Valor | Origem e configuração |
| --- | --- |
| Pasta da distribuição | Localização deste `src/`; descoberta pelo instalador. |
| Destino do Worker | `-WorkerHome` ou `LOCAL_WORKER_HOME`; padrão derivado do perfil do usuário. |
| Diretório/configuração Codex | `-CodexHome` ou `CODEX_HOME`; arquivo `config.toml` derivado. |
| Sobrescrita da base Codex para entrega/consulta | `LOCAL_CODEX_HOME`; padrão `CODEX_HOME` ou perfil atual. |
| Executáveis Git, Node, npm, Ollama e Codex | `-GitExe`, `-NodeExe`, `-NpmExe`, `-OllamaExe`, `-CodexExe` ou descoberta no PATH/instalação. |
| Modelo Ollama e base | `-WorkerModel`/`LOCAL_MODEL`; `-BaseModel`/`LOCAL_BASE_MODEL`; padrões em `config.json` e no instalador. |
| Janela do modelo | `-ModelContextTokens` no instalador; padrão 32768 tokens. |
| URL Ollama | `OLLAMA_URL` ou `config.json:ollama_url`. |
| Timeout, passos e tentativas | `LOCAL_WORKER_TIMEOUT_MS`, `LOCAL_WORKER_MAX_STEPS`, `LOCAL_OLLAMA_ATTEMPTS` ou `config.json`. |
| Regras do Worker | `LOCAL_WORKER_RULES`; padrão `AGENTS.md` instalado. |
| CLI de entrega | `LOCAL_CODEX_CMD`, `CODEX_CLI_PATH` ou `config.json:codex_command`, com redescoberta no PATH/Desktop. |
| Pré-argumentos do CLI | `LOCAL_CODEX_PREARGS_JSON`; somente cenários controlados. |
| Pasta de jobs, recuperação e latência | Derivadas do diretório instalado; não editar manualmente. |
| Intervalo do watchdog | `-WatchdogIntervalMinutes` ou `-IntervalMinutes` no registro da tarefa; padrão 15 minutos. |
| Nome da tarefa agendada | `-WatchdogTaskName` no instalador ou `-TaskName` no script de registro; padrão `CodexLocalWorkerWatchdog`. |
| Identidade do repositório que mantém o Worker | `-MaintenanceRepo` nos scripts internos ou `LOCAL_WORKER_MAINTENANCE_REPO`; padrão descoberto pela raiz Git da fonte, sem caminho fixo. |
| Configuração Codex dos scripts internos | `-CodexConfig`; padrão `CODEX_HOME/config.toml`. |
| Destino e executáveis nos scripts internos | `-Target`, `-NodePath`, `-NpmCommand`, `-CodexCommand`; o instalador principal calcula e passa esses valores. |
| Recursos opcionais do instalador | `-SkipPrerequisites`, `-SkipModel`, `-SkipWatchdog`, `-SkipGlobalRules`; apenas para instalação parcial/controlada. |
| Download de modelos Ollama | `OLLAMA_MODELS` conforme configuração oficial do Ollama. |
| Remoção de notificações | `LOCAL_DISABLE_NOTIFY=1` para testes sem balão. |
| Descoberta de aplicativos | `PATH` e `LOCALAPPDATA`, fornecidos pelo Windows; redescobertos no momento da entrega. |
| Origem do App Installer | URL oficial `https://aka.ms/getwinget`, família Windows `Microsoft.DesktopAppInstaller_8wekyb3d8bbwe` e produto Microsoft Store `9NBLGGH4NNS1`; definidos uma vez no topo do instalador. |
| Pacotes WinGet | `Git.Git`, `OpenJS.NodeJS.LTS`, `Ollama.Ollama` e produto Desktop `9PLM9XGG6VKS`; definidos uma vez no topo do instalador. |
| Notificação Windows | `-Title`, `-Body`, `-Kind` são recebidos do Worker; `-Kind` aceita `info` ou `error`. |

O instalador não recebe tokens nem os grava. Valores da máquina são calculados em execução e ficam fora desta árvore.

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
