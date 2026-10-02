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
| URL Ollama | `OLLAMA_URL` ou `config.json:ollama_url`; prefixo de caminho de proxy é preservado. |
| Timeout, passos e tentativas | `LOCAL_WORKER_TIMEOUT_MS`, `LOCAL_WORKER_MAX_STEPS`, `LOCAL_OLLAMA_ATTEMPTS` ou `config.json`. |
| Orçamento de CPU | `LOCAL_WORKER_CPU_THREADS` ou `config.json:cpu_threads` (`auto`); mesmo valor explícito é limitado a preservar ao menos 25% dos processadores lógicos. |
| Reserva de RAM | 10% da RAM física ou 4 GiB, o maior; pressão gera espera de até 120 s por requisição e diagnóstico de infraestrutura. Limites ficam no topo de `worker-core.mjs`. |
| Reserva de VRAM | `LOCAL_WORKER_GPU_RESERVE_BYTES` no instalador e runtime. O runtime exige pelo menos 512 MiB ou 10% da GPU NVIDIA livres antes de inferir; após pressão, descarrega o modelo e ajusta `num_gpu` para a próxima chamada. A calibração fica em `jobs/gpu-policy.json`, expira após sete dias e é ignorada se a memória disponível mudar materialmente. O instalador contabiliza pelo menos 512 MiB ou 20% da menor GPU NVIDIA em `OLLAMA_GPU_OVERHEAD` como estimativa de carga, preservando valor preexistente maior. Se Ollama já estiver em execução, reinicie-o após `ollama_restart_required_for_gpu_reserve=true`. |
| Retenção do modelo na memória | `LOCAL_OLLAMA_KEEP_ALIVE` ou `config.json:ollama_keep_alive`; padrão `2m`, para liberar RAM/VRAM após ociosidade. |
| Resposta HTTP Ollama | Limite de 32 MiB centralizado no topo de `worker-core.mjs`; o prazo de espera é o timeout total do job. |
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
| Monitor local | `monitor_url` é gerado em cada delegação; host `127.0.0.1`, porta dinâmica, chave aleatória em `monitor.json` no destino. Não publique o link. Limites de heartbeat/espera e intervalo de reconciliação (60 s) estão no topo de `monitor.mjs`; carência de órfão (120 s) no topo de `watchdog.mjs`. |
| Alvos obrigatórios de escrita | `required_change_paths` em `local_analyze`, lista de caminhos relativos; cada alvo deve mudar durante o job. Use com `expect_changes=true`. |
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
| `src/localworker/AGENTS.md` | `026b4c3cf431a01c08583cd882574f0a19ea772799117084255d2b0e580bf3aa` |
| `src/localworker/config.json` | `6128724ed765dcb78cbc457bac81ee7257ffb11dc196ec3730b5e1a605ddd3c7` |
| `src/localworker/package.json` | `27a6750c9ce0bb5d65ff7034a7010c29a07df210b9c769532a18c52ecc39c953` |
| `src/localworker/package-lock.json` | `1c1f7f1e2c68af0041ea911237d1dee9ff36bc604f3a7c52ba75de470110b91f` |
| `src/localworker/server.mjs` | `91179c46638fcb581a8164acfe7dad969dabfbf46cca98eda6d6be671861134d` |
| `src/localworker/thread-check.mjs` | `83683a14a1f451f20d2761eac851522241e870366b1b25be2582ccfeacddbb79` |
| `src/localworker/job-store.mjs` | `d30240c99c6c4f3832c577a3ccc55c49c84807617dc8b1c2d657b62797dfa497` |
| `src/localworker/worker-core.mjs` | `66d404325251794894de5093523ef441c925f7655c726e77b28022d00233ff2e` |
| `src/localworker/worker-runner.mjs` | `fa3150b3b00c7353725189991267ed4521e92829d5aef11e0a7a8c64282a7703` |
| `src/localworker/delivery.mjs` | `d02c74839dcf59292c88f1124113b2fa08b4ad8f1413c888f562b0cb0d631674` |
| `src/localworker/watchdog.mjs` | `bfd62e143e17bb416e607f213fac6abba03699951b191b12e53d8afa733fa3da` |
| `src/localworker/monitor.mjs` | `86f56c938b326c57293242d5acc2ead10d5e595985a661783622ba78c2a17bb4` |
| `src/localworker/notify.ps1` | `013280cd736de251f2e687f61fb3a83bbb6c9ee83a08eeec67cc22b9adef66cc` |
| `src/localworker/install.ps1` | `4d4beeb08f5d9faa50f9d2a720d6a89b023d6cab7412eb2a0b3a3aca644685dd` |
| `src/localworker/update-installed.ps1` | `8777979eedf9d8c6e0bbc3665da9d008fa58392da27e3c9b24e04ca78df58546` |
| `src/localworker/register-watchdog.ps1` | `d78fa380059112826d061097c4138bcbcabc369a6888d6a875cda649bcad3efb` |
| `src/install.ps1` | `a553471c7076ffa68dc22242d0dd225ed6393e47764e51204bcc171bce0d52b8` |
| `src/agents.supervisor.md` | `e95a4a0c0184f3c94637ad2dfcc3dd19a2f3a11b297bf16ee38ed2adcd2dd520` |
<!-- LOCALWORKER_GENERATED_END -->
