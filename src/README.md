# Artefatos portáveis

`supervisor/` é componente opcional e independente de retomada do chat após restauração de cota. `supervisor/install.ps1` recebe `ThreadId` e `RepoPath`; demais paths são descobertos/parametrizados. O [contrato e todos os parâmetros](supervisor/README.md) descreve conta, runtime, tarefas, mutex, limiar, relógio, backoff e limitações. Nenhum ID de chat, path de desenvolvimento ou segredo é distribuído.

`install.ps1` é a entrada para Windows 11 2025H2+. `localworker/` contém os arquivos que serão instalados no perfil escolhido. `agents.supervisor.md` define o bloco global do Codex; `agents.worker.md` espelha as regras instaladas do Worker. O runtime testado reside em `../localworker/`; `../scripts/sync-src.mjs` gera os espelhos e verifica sua equivalência antes de cada commit.

`localworker/supervisor-review.mts` é a fonte Q8S; `.mjs` é gerado. Parâmetros de `local_review`: job/recibo/credencial devolvidos por `local_result`, revisão esperada, confirmação de exame, ID/diretório atuais do supervisor, nota inteira0–10 e motivo≤360 caracteres (obrigatório≤3/≥8). Não edite credenciais no arquivo nem as publique. Limites centralizados no topo da fonte:16 retornos,32 revisões e1000 entradas transitórias de cache; alteração exige regeneração/validação, não edição do artefato instalado. A avaliação persiste somente no diretório do job; exclusão/retenção abrangem o registro. O monitor projeta nota/motivo/histórico sem token. Não há path privado ou nota padrão configurada.

Migração de retorno já recebido/examinado sem recibo: `legacy_received` substitui os dois campos de credencial com origem rastreável, status/error_kind e hashes UTF-8 do resultado/final recebidos. Exige revisão0 e nenhum registro existente; não altera nota anterior e só admite retry idêntico da primeira importação. O confronto não executa inferência ou nova consulta local_result. O procedimento completo e as limitações estão em `../howto.md`.

`localworker/response-contract.mts` é a fonte R8V; `.mjs` é gerado. Parâmetro opcional `response_contract` de `local_analyze`: `{version:1,max_words?,json_schema?,citations?:[{output_pointer,source_pointer}]}`; ao menos tamanho ou schema é obrigatório. Limites centralizados no topo: schema8192 caracteres/64 nós/profundidade8,2000 palavras,16 vínculos, pointer256 caracteres/profundidade12, string4000 caracteres,32 itens/campos/valores enum, descrição240, nome120 e magnitude numérica1e12. Schema raiz objeto, propriedades adicionais proibidas; tipos simples/objetos/arrays limitados, sem regex/ref remota. Não há path físico ou segredo configurável nesse módulo. `worker-core.mjs` limita correção a duas saídas recusadas e artefato final16000 caracteres, sem repetir comandos ou truncar JSON validado. Alterar limites requer fonte/regeneração/testes, não edição manual do destino. JSON estruturado exige provided_evidence read-only sem comandos/inspeções adicionais; tamanho textual também compõe os fluxos existentes. Forma/vínculo validados não são aceite semântico. A versão aceita aparece no recibo RUNNING.

`localworker/mcp-config.mjs` registra e revalida o MCP pelo CLI do Codex, com backup. O instalador e o atualizador o executam; o watchdog agendado restaura um registro perdido. `codex_config` no `config.json` instalado aponta para o arquivo efetivo, descoberto a partir de `-CodexHome`/`CODEX_HOME`.

`localworker/mcp-call.mjs` é a ponte de emergência para chats cujo catálogo já nasceu sem MCP. Recebe nome de ferramenta e objeto JSON UTF-8 em Base64; invoca o mesmo `server.mjs` via stdio e encerra apenas o transporte após a resposta. Não altera a duração do job persistente.

## Valores substituíveis

### Manutenção própria: SW-HYBRID v1

`install.ps1 -EnableHybridMaintenance` adota explicitamente `config.json:maintenance_hybrid_version=1`; sem adoção, o veto anterior permanece. Atualização sem a opção preserva a escolha existente. Incompatível com `GlobalRulesOnly`. Identidade/path/Git continuam delimitando manutenção própria, incluindo árvore movida; não aplicar contrato a outro repositório.

`localworker/delegation-policy.mts` é a fonte; `.mjs` é gerado/instalado e funciona em Node 22.21+ já utilizado (sem exigir upgrade para habilitar o recurso). CLI `node <WorkerHome>/delegation-policy.mjs --hash-base64 <JSON UTF-8 Base64>` devolve SHA-256, sem escrita/rede/inferência; `--help`; exit0 sucesso/2 entrada inválida. Não reclassifica riscos. Limites centralizados: versão1, até32 paths exatos de alteração, rationale/evidence12–2000 caracteres; JSON Base64 CLI≤100000 caracteres. Hash não é assinatura/autenticação/inviolabilidade.

`maintenance_supervision`: `{version:1,criticality:C,regime:'junior'|'intern'|'exclusive',uncertainty_resolved:true,rationale,evidence,scope_paths,scope_sha256,approved_action?}`. C é decidido SOMENTE pelo supervisor. C≤5 júnior, 5<C≤7 escolha fundamentada, C>7/exclusive não delegam. Scripts/Skills triviais/determinísticos seguros e previamente verificados são preferidos em toda criticidade, pelo supervisor exclusivo se C>7. `scope_paths` contém arquivos relativos exatos (não diretórios), sem traversal; requisitos de leitura são separados. `scope_sha256` é calculado depois de todos os campos/avaliação e antes do envio; defaults de modo, alterações, commit e comandos são normalizados. Qualquer mudança nessa projeção exige recalcular após REAVALIAÇÃO, não apenas obter outro hash mecanicamente.

Estagiário em `write` exige `commit_policy='supervisor'` e `approved_action={tool,args}` exata (`write_file`, `edit_file`, `move_file`, `delete_file`, `run_authorized_command`). Uma tentativa com efeito consome aprovação mesmo se parcialmente falha; antes de outro efeito, runner persiste `NEEDS_SUPERVISOR` e entrega checkpoint no fluxo existente, sem replay. Em `read-only`, não forneça approved_action; ferramentas continuam impedindo escrita. Validações exatas read-only podem ocorrer após o efeito. Júnior preserva ferramentas/subagente factual e autonomia no escopo; `run_command` na manutenção exige substituição por comando exato aprovado, sem retirar a capacidade via `run_authorized_command`. Todos os efeitos de executáveis/argv devem ser previamente verificados: essa autorização não cria sandbox/firewall.

MCP e core/runner revalidam antes de efeitos. Eventos `supervision_verified` e `supervisor_checkpoint`, recibos/evidências e Git seguem os diretórios exclusivos existentes. Checkpoint usa estado terminal FAILED com `error_kind=NEEDS_SUPERVISOR`, distinguindo pausa para revisão de falha de infraestrutura; não é sucesso nem autorização para repetir. Após review/commit da menor unidade, supervisor concede nova unidade materialmente delimitada. Modelo/esforço e demais projetos permanecem intactos. O validador não prova que a avaliação humana está correta nem impede um administrador de modificar código; não prometer garantia superior à autoridade/controles reais.

Contrato por job: `provided_evidence={source,content}` opcional somente em `read-only`; origem até 1024 caracteres e conteúdo até 12000, ambos não vazios. Permite análise sem nova ferramenta; requisitos explícitos de leitura/comando continuam obrigatórios. Não é configuração global nem autorização de escrita.

| Valor | Origem e configuração |
| --- | --- |
| Pasta da distribuição | Localização deste `src/`; descoberta pelo instalador. |
| Destino do Worker | `-WorkerHome` ou `LOCAL_WORKER_HOME`; padrão derivado do perfil do usuário. |
| Diretório/configuração Codex | `-CodexHome` ou `CODEX_HOME`; arquivo `config.toml` derivado. Para regras globais, o instalador usa `AGENTS.override.md` se existir, senão `AGENTS.md`, preservando conteúdo não gerido. |
| Sobrescrita da base Codex para entrega/consulta | `LOCAL_CODEX_HOME`; padrão `CODEX_HOME` ou perfil atual. |
| Executáveis Git, Node, npm, Ollama e Codex | `-GitExe`, `-NodeExe`, `-NpmExe`, `-OllamaExe`, `-CodexExe` ou descoberta no PATH/instalação. |
| Modelo Ollama e base | `-WorkerModel`/`LOCAL_MODEL`; `-BaseModel`/`LOCAL_BASE_MODEL`; padrões em `config.json` e no instalador. |
| Janela do modelo | `-ModelContextTokens` no instalador; padrão 32768 tokens. |
| Atualização com job ativo | `-WaitForIdle` em `install.ps1` aguarda término por evento local; recuperação de evento perdido a cada 60 s. Sem a opção, atualização ativa é recusada. |
| Continuidade de contexto | `LOCAL_WORKER_CONTEXT_TOKENS`/`config.json:context_tokens` (padrão 32768) define janela inicial; `LOCAL_WORKER_MIN_CONTEXT_TOKENS`/`config.json:min_context_tokens` (padrão 8192) define piso. `LOCAL_WORKER_CONTEXT_TRIGGER_FRACTION` (padrão 0.68), `LOCAL_WORKER_CONTEXT_RAM_MARGIN_BYTES` (1 GiB) e `LOCAL_WORKER_CONTEXT_VRAM_MARGIN_MIB` (512 MiB) controlam gatilhos preventivos. `context-manager.mjs` centraliza alvo de 56%, economia mínima de 512 tokens, preferência por 8 mensagens recentes com redução progressiva até zero (sem arquivar a última reidratação antes de uso), sem teto cumulativo de checkpoints produtivos e limite de 12000 caracteres por reidratação. Checkpoints exclusivos ficam em `jobs/<job_id>/context/` e são removidos com o job. |
| URL Ollama | `OLLAMA_URL` ou `config.json:ollama_url`; prefixo de caminho de proxy é preservado. |
| Timeout, passos e tentativas | `LOCAL_WORKER_TIMEOUT_MS`, `LOCAL_WORKER_MAX_STEPS` (inteiro positivo; padrão 40 ciclos por job), `LOCAL_OLLAMA_ATTEMPTS` ou `config.json`. O teto de ciclos protege a janela de contexto e não é prazo total. |
| Anti-loop | `progress-guard.mjs` centraliza `NO_PROGRESS_LIMIT_P6R=4` ações consecutivas sem progresso e `TRANSIENT_RETRIES_P6R=2` retries de leitura transitória. Não são limites de duração ou de ações produtivas. Assinaturas, estado e evidência são avaliados automaticamente; não exige configuração manual. |
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
| Retenção do histórico | `LOCAL_WORKER_HISTORY_DAYS` (90), `LOCAL_WORKER_HISTORY_MAX_JOBS` (500), `LOCAL_WORKER_HISTORY_MAX_BYTES` (536870912) e `LOCAL_WORKER_HISTORY_MAX_TOTAL_JOBS` (1000). A limpeza verifica a cada 6 h e só remove jobs terminais com entrega `QUEUED_TO_CHAT` ou `PAUSED_USER` comprovadamente não enviada (`not_sent=true`); jobs ativos, pendentes e ambíguos são preservados. Ao chegar ao teto total, tenta limpar elegíveis e, se persistir, impede novo job com diagnóstico. |
| Log operacional por job | `MAX_AUDIT_LOG_BYTES_K9P` (2 MiB) e `AUDIT_LOG_TAIL_BYTES_K9P` (1 MiB) no topo de `worker-runner.mjs`; compactação registra o evento e preserva a cauda recente, sem afetar resultado/estado. |
| Limites da UI/API | `MAX_EVENTS_M7Q` (2000 eventos recentes por detalhe), `MAX_LIST_LIMIT_M7Q` (100 linhas por resposta), `PAGE_LIMIT_M7Q` (50 linhas por página); constantes no topo de `monitor.mjs`/script de `monitor-page.mjs`. Se houver mais eventos que o limite, a timeline mostra os mais recentes em ordem cronológica. |
| Tempos de observação | `STALE_HEARTBEAT_MS_M7Q` (90 s), `WAIT_MODEL_MS_M7Q` (180 s), `WATCHDOG_INTERVAL_MS_M7Q` (60 s), `DETAIL_REFRESH_MS_M7Q` (3 s), `INDEX_REFRESH_MS_M7Q` (10 s), carência de órfão `ORPHAN_GRACE_MS_W8K` (120 s). Alterar somente com validação proporcional e atualização do guia. |
| Nome da tarefa agendada | `-WatchdogTaskName` no instalador ou `-TaskName` no script de registro; padrão `CodexLocalWorkerWatchdog`. |
| Lançador invisível do watchdog | `watchdog-launch.vbs.template` contém o modelo portável; `register-watchdog.ps1` substitui `__NODE_EXECUTABLE__` e `__WATCHDOG_SCRIPT__` pelos paths descobertos e gera `watchdog-launch.vbs` no destino. A tarefa chama `wscript.exe //B //Nologo`. Windows Script Host é componente do Windows 11. |
| Identidade do repositório que mantém o Worker | O instalador cria ou preserva `.localworker-maintenance-id` ao lado de `src/` e copia seu UUID para `config.json:maintenance_id`. `-MaintenanceRepo` nos scripts internos ou `LOCAL_WORKER_MAINTENANCE_REPO` conserva a comparação física/Git; `LOCAL_WORKER_MAINTENANCE_ID` é substituição controlada para teste. O marcador exclusivo da fonte fica fora de `src/`. |
| Configuração Codex dos scripts internos | `-CodexConfig`; padrão `CODEX_HOME/config.toml`. |
| Destino e executáveis nos scripts internos | `-Target`, `-NodePath`, `-NpmCommand`, `-CodexCommand`; o instalador principal calcula e passa esses valores. |
| Recursos opcionais do instalador | `-SkipPrerequisites`, `-SkipModel`, `-SkipWatchdog`, `-SkipGlobalRules`; apenas para instalação parcial/controlada. |
| Somente norma global | `-GlobalRulesOnly`, com `-CodexHome`/`CODEX_HOME`; usa a mesma mesclagem e backup, sem runtime/dependências/tarefas nem espera do job. Conflita com `-SkipGlobalRules`; não comprova prontidão do Worker. |
| Download de modelos Ollama | `OLLAMA_MODELS` conforme configuração oficial do Ollama. |
| Remoção de notificações | `LOCAL_DISABLE_NOTIFY=1` para testes sem balão. |
| Monitor local | `monitor_url` abre o detalhe; `monitor_index_url`, `local_monitor` ou `node monitor.mjs index` dão acesso ao inventário. Host `127.0.0.1`, porta primária `49767` e fallback `49768`, chave aleatória em `monitor.json` no destino. Não publique os links. Limites de heartbeat/espera e reconciliação de anomalias (60 s) estão no topo de `monitor.mjs`; carência de órfão (120 s) no topo de `watchdog.mjs`. A UI atualiza sem reload em 3 s no detalhe e 10 s no inventário enquanto visível. |
| Indicadores do monitor | `monitor.mjs` amostra CPU do sistema e processos Ollama, RAM e GPU/VRAM NVIDIA; `monitor-page.mjs` exibe barras responsivas após os cards de estado. CPU/GPU usam percentual medido; RAM/VRAM usam capacidade observada. Ausência de medição deixa a barra neutra. A coleta de Ollama não separa consumo por job. |
| Alvos obrigatórios de escrita | `required_change_paths` em `local_analyze`, lista de caminhos relativos; cada alvo deve mudar durante o job. Use com `expect_changes=true`. |
| Evidência obrigatória | `required_read_paths`: até 32 arquivos relativos a ler; `required_command_ids`: até 32 IDs autorizados que devem concluir com código zero. Padrão listas vazias para compatibilidade; supervisor deve preenchê-las conforme o aceite. |
| Sequência determinística | `command_sequence`: até 32 IDs distintos de `authorized_commands`, na ordem de execução, sem inferência nem retry automático. Não combinar com `required_read_paths`: a sequência valida por comandos. |
| Repetição de comando | `authorized_commands[].repeatable`, padrão `false`; `true` somente para repetição segura necessária. Argumentos multiline são suportados como argv literal. |
| Efeito do comando | `authorized_commands[].mode`: `write` por padrão; `read-only` permite comando exato em job somente leitura, após verificação dos efeitos pelo supervisor. Não é sandbox do executável. |
| Rede por comando | `authorized_commands[].network`: `false` por padrão; `true` declara autorização restrita aos destinos/efeitos do argv/script revisado (por exemplo CLI GitHub já instalado). Não é firewall nem acesso livre; o supervisor valida a capacidade e a autorização. |
| Commit da unidade | `commit_policy`: `worker` (padrão) ou `supervisor` (commit imediato após revisão, preservando propriedade de alterações herdadas). |
| Evidência persistida | `jobs/<id>/evidence.jsonl`, máximo técnico de 16 MiB; resultados de ferramentas, argumentos e hashes, privado do job, nunca conteúdo público do monitor. |
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
| `src/supervisor/continuity.mts` | `8863572d25d32a632dc1fde2dd91836edb6c061c81c37ee0891d53ecfd11b258` |
| `src/supervisor/continuity.mjs` | `739301ccb005e09927875cfdd4ca0199099978895ecdbf6abfbf9d39968e682c` |
| `src/supervisor/continuity.ps1` | `85f51151ba955a5abcc84ebb8a729fbe32d85a7c562705c4e7fa27826f0bc47c` |
| `src/supervisor/core.mts` | `08aa52f224acdfa92206f0f5792a600be79debae7a3c7034cf680167bf352769` |
| `src/supervisor/core.mjs` | `95a30716e050eaae40fa2dec77e06c29bdbadf762f36dd4d2aedfb6a88b61ed9` |
| `src/supervisor/rpc.mts` | `8cc5b9e550bf068a60d7383a9fb46894cc13ec8c2503b8b3601e3049c6b39709` |
| `src/supervisor/rpc.mjs` | `6745f678c8c2c629c9cc27f42f0a162ad26b7608310a84a7676924d6dbe23fe0` |
| `src/supervisor/receipts.mts` | `fda754fe4058f2ef35ed513958fe7f46f12a7269593c7815bf4482216dd354e3` |
| `src/supervisor/receipts.mjs` | `9ae5ed4a69248385ababcafc8c53c0d08963c54e000bbd8b662c5a57621a7955` |
| `src/supervisor/run.mts` | `ef7e9567e2752fd367f9409d98dbdfdbe1598a401fe5ad85fa29d7a0808cd92b` |
| `src/supervisor/run.mjs` | `31e04f1acce617c42a76d81c350e3e3edfe2ef6e49a8f890ca44798846c1afee` |
| `src/supervisor/platform.ps1` | `56f059a445107bff10e54463934382040eaa4e0fc944175819c5a7b0db1c51e6` |
| `src/supervisor/install.ps1` | `72c4a1599bdfecb98ac88d00eefdd353dd018310a6a65c5c8d1342152a9f6585` |
| `src/supervisor/README.md` | `ee132ea9b60d76ac7462c8a14560320a3c71d35ca9533a649f91fc39ecf6d272` |
| `src/localworker/AGENTS.md` | `a5eabadb61c8c0f561b4bdd926cf75bf6b51e3d6fb77350312ac6d75856fe80f` |
| `src/localworker/config.json` | `642a741b3fdb62c505dfe31fcb580919b6c577688e3b497929f26b936d96634f` |
| `src/localworker/package.json` | `27a6750c9ce0bb5d65ff7034a7010c29a07df210b9c769532a18c52ecc39c953` |
| `src/localworker/package-lock.json` | `1c1f7f1e2c68af0041ea911237d1dee9ff36bc604f3a7c52ba75de470110b91f` |
| `src/localworker/server.mts` | `17bf561726266af197297343eed29f1f350d4d2c3ed69ad2eb797b8d3d8ab623` |
| `src/localworker/server.mjs` | `17bf561726266af197297343eed29f1f350d4d2c3ed69ad2eb797b8d3d8ab623` |
| `src/localworker/response-contract.mts` | `27bc1ffbf52e32b5758e30922aa400f6e15480db8f50adfc937f770ad226c19e` |
| `src/localworker/response-contract.mjs` | `17457d13030387d9413523fe40179197e08c6cd9e1133da4ccd4e3604791e1ab` |
| `src/localworker/supervisor-review.mts` | `3293b645f10bc9270fe5b01ff69b315a72a20a8fce7024c462b3b230209b1d89` |
| `src/localworker/supervisor-review.mjs` | `53210647454bd3b062f1425749ee19054cd9ede5cdcb2446410cf8fc55988576` |
| `src/localworker/delegation-policy.mts` | `450ac2416ff1fb87f45e4d98f64a5c2a5ab2d63745b335257beca5d0d57940c9` |
| `src/localworker/delegation-policy.mjs` | `9d424dbe6ab0dc0640ce2ef98364f6d2ab73c3fcc92d0239f9aa3930f1ec534d` |
| `src/localworker/continuity.mts` | `8863572d25d32a632dc1fde2dd91836edb6c061c81c37ee0891d53ecfd11b258` |
| `src/localworker/continuity.mjs` | `739301ccb005e09927875cfdd4ca0199099978895ecdbf6abfbf9d39968e682c` |
| `src/localworker/continuity.ps1` | `85f51151ba955a5abcc84ebb8a729fbe32d85a7c562705c4e7fa27826f0bc47c` |
| `src/localworker/thread-check.mjs` | `83683a14a1f451f20d2761eac851522241e870366b1b25be2582ccfeacddbb79` |
| `src/localworker/job-store.mjs` | `e61fc8c102cc8fa5850fdc112043f0ef220d87a96d772489ac85bca270a26c15` |
| `src/localworker/job-control.mjs` | `627b26ae4028e3e3435b89653d48a8f954f07eae1a9e5b6bc23d4ddcc1eeeca1` |
| `src/localworker/context-manager.mjs` | `addcc0cf78334908092424403b930782430a2e411fafd79ae64ff3cd43433f6d` |
| `src/localworker/progress-guard.mjs` | `8d127ab9947545f79c435a06f0147ac6f813b195d417db93fdce1ac42a99b1bb` |
| `src/localworker/worker-core.mjs` | `cd06ef97f0843f4fa6ec330b643065be34570c02b7337d1486593dcff314df29` |
| `src/localworker/worker-runner.mjs` | `41ed80e3d86085d6206a782b9151a0b043e2b6532156594407c449c505a4fe1d` |
| `src/localworker/delivery.mts` | `4931495d5d7faebf16bd8dd4ab092a2a6618cede4fc3de386fcf4210164b59ed` |
| `src/localworker/delivery.mjs` | `4931495d5d7faebf16bd8dd4ab092a2a6618cede4fc3de386fcf4210164b59ed` |
| `src/localworker/watchdog.mjs` | `e1e2097128d3a171320037eba966cdf949569cb6fd2f1da0d580a6dcc412a99e` |
| `src/localworker/monitor.mjs` | `188a30bda9e7c367ff7773bb2e9144e03cf27160f2a844b473e30d4b8701f2c6` |
| `src/localworker/monitor-page.mjs` | `762ca8da196a1af84e340e785ee60064a88a015bb2322becc495b2a590c64967` |
| `src/localworker/mcp-config.mjs` | `7fa6b853c9eb57b5fc3aa2c7ffeeb95818653874d6498955c98e0711906d1cdb` |
| `src/localworker/mcp-call.mjs` | `2f1e2823a4b05a741997f3b345b0da40303e06ed71747635e14c6edc881fe01e` |
| `src/localworker/notify.ps1` | `013280cd736de251f2e687f61fb3a83bbb6c9ee83a08eeec67cc22b9adef66cc` |
| `src/localworker/install.ps1` | `c90591e3223009d3da4314935fb1eb7cc5d2b9479274daaf32449a07440b6805` |
| `src/localworker/update-installed.ps1` | `df85948ab86f2251e43a0ed47d83138622b63b5a2effa1cee52332c19e78902a` |
| `src/localworker/register-watchdog.ps1` | `0096c03844666cf25ae1bddad89fbf4280cb3b5b9805a0d98ecab9f6e4254d28` |
| `src/localworker/watchdog-launch.vbs.template` | `72a8461cf986ef5d4f737a4fdb61348a9f212576930b4530c3df6ac9022bd3f3` |
| `src/install.ps1` | `cfb246b604d170886b788fa294cc1a3841867a648895f40706d3a7f06c311467` |
| `src/agents.supervisor.md` | `19209366b43e90c52157340ca255b96defe377561094ec276b38c25bcd02c769` |
<!-- LOCALWORKER_GENERATED_END -->

## Continuidade U6C

`localworker/continuity.mts` e `continuity.ps1`: fonte comum de observação somente leitura, gerada em JS e espelhada também em `supervisor/`; não dependem da árvore de desenvolvimento. Não há parâmetro para ignorar intenção. SystemRoot/WINDIR vêm do SO; CODEX_HOME/LOCAL_CODEX_HOME localizam metadados; Worker e SR-001 seguem seus diretórios instalados. Identidades bootId/desktopInstance/originTurnId/generation são capturadas, nunca editadas manualmente. `continuity.json` privado por conversa: ACTIVE/PAUSED, motivo, sessão, geração, horário; PAUSED_USER em evento/entrega não é COMPLETED. `delivery-authorization.json` privado por job só é criado por retomada explícita de callback comprovadamente não enviado. `platform.ps1 -Action Pause|Resume -Config <config.json>` controla SR-001; `delivery.mjs resume <job_id>` controla entrega pausada sem reexecutar job. Instalar não rearma legado. Consulte os comandos sequenciais e limitações no howto e no README do supervisor.

## Rascunho recusado e contexto

`localworker/context-manager.mjs` distingue exclusivamente rascunhos explicitamente recusados pelo runtime; nenhuma opção do modelo/usuário marca decisões como descartáveis. Pressão contextual usa o checkpoint existente, com `rejected_draft_entries` opcional no schema v1; checkpoints anteriores continuam legíveis. Texto público completo, hash, objetivo/normas/feedback e decisões consolidadas são preservados conforme seu contrato; pensamento privado não é copiado. `context_recall` retorna `rejected_draft` e paginação já existente; campo falso não implica aceite. Eventos `context_compacted.rejected_drafts_archived` informam quantos rascunhos saíram do contexto ativo, sem publicar conteúdo. Sem parâmetro novo nem aumento automático de num_ctx; limites e reservas continuam os existentes. Fonte legada .mjs espelhada pelo mecanismo canônico, sem cópia manual na instalação.
