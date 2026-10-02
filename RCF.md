# RCF — localWorker para Codex Desktop

## Objetivo

O localWorker executa tarefas delegáveis em inferência Ollama local, com jobs persistentes, resultado verificável e retomada do mesmo chat no Codex Desktop. A seleção de modelo e esforço do supervisor permanece independente. `AGENTS.md` e `agents.local.md` governam a atuação; este RCF define o produto e seus contratos.

## Arquitetura vigente

1. O MCP `localworker` recebe `repoPath` absoluto, `thread_id` do chat atual, tarefa e modo `read-only` ou `write`; `write` exige autorização. Comandos adicionais são exatos e pré-aprovados. `expect_changes` exige alteração líquida; `required_change_paths` exige mudança em cada alvo relativo conhecido, inclusive se houver alterações preexistentes em outros arquivos.
2. O servidor valida identidade do chat, diretório, escopo e bloqueio de autouso antes de criar job. Um runner persiste estado, resultado, log, Git determinístico, latência e classificação de falhas. O watchdog recupera jobs interrompidos e entregas pendentes.
3. A conclusão é enviada por `codex queue` ao mesmo `thread_id`. O caminho do CLI é descoberto novamente na entrega. Erro comprovadamente anterior ao envio pode ser recuperado uma vez; estado ambíguo não permite duplicação automática.
4. O Worker dispõe de leitura, busca, status/diff Git e, quando autorizado, escrita, edição, movimentação sem sobrescrita, exclusão com backup recuperável e comandos delimitados. `git_status` explicita upstream e contagens determinísticas de commits à frente/atrás; arquivo modificado no working tree não implica commit não enviado. Confinamento por caminho real e regras aplicáveis do repositório são obrigatórios.
5. O supervisor consulta o resultado uma vez após retomada, revisa riscos e evidência proporcionalmente e continua unidades pendentes; término da inferência não prova conclusão da solicitação.
6. Cada delegação fornece `monitor_url` para o job e `monitor_index_url` para todos os jobs retidos; `local_monitor` e `node monitor.mjs index` redescobrem o link atual sem ID. O monitor HTTP liga somente em `127.0.0.1`, corre em processo separado e lê telemetria persistida; abrir ou fechar a página não afeta o runner. Ele mostra fase, ferramentas, recursos acessados, tempos, contadores de progresso, uso observável de CPU/memória/GPU, erros e entrega. Não expõe raciocínio interno nem conteúdo de arquivos. `local_status` também expõe atividade derivada.
7. `RUNNING` é estado formal, não prova de processamento ativo. Heartbeat, PID, último evento, espera por Ollama e uso observável de recursos distinguem `ACTIVE`, `WAITING_MODEL`, `WAITING`, `STALLED_SUSPECTED`, `STALLED`, `ORPHANED` e `TERMINAL_NOT_PROPAGATED`. GPU indisponível torna estagnação uma suspeita explicitada. O watchdog, o monitor independente e as consultas de estado/resultado reconciliam runner desaparecido, preservam alterações parciais, registram Git determinístico e entregam o diagnóstico sem duplicar inferência.
8. Em escrita obrigatória, o Worker recebe alertas de orçamento antes do limite, deixa de receber ferramentas de listagem ampla na metade dos ciclos e rejeita consultas idênticas recorrentes. Esgotamento de ciclos é `WORKER_INCOMPLETE`, com contagem de mutações e ferramentas, nunca falha de transporte. Comandos autorizados e comandos de validação Node/npm que falharam permanecem pendentes até nova execução bem-sucedida da mesma validação; a resposta do modelo não pode converter falha observada em `COMPLETED`. Isso exige correção de segmentação/estratégia antes de nova delegação.
9. O job e cada inferência Ollama não têm teto temporal por padrão (`timeout_ms=0`); duração longa, isoladamente, não é falha. Um administrador pode definir teto positivo explícito em milissegundos. O transporte HTTP não impõe timeout implícito de cabeçalho. A espera sob falta de recursos mantém janelas técnicas de até 120 s; pressão de RAM aciona uma tentativa de liberar o próprio modelo carregado, com nova janela finita após liberação bem-sucedida. Comandos autorizados (até 300 s), tentativas de transporte e tamanho de resposta conservam limites técnicos próprios para proteger o SO e diagnosticar bloqueios. Falhas transitórias de conexão recebem tentativas limitadas. A saída padrão e de erro de comandos autorizados falhos é devolvida de forma limitada ao Worker para diagnóstico; o monitor recebe apenas resumo operacional.
10. Recursos do SO e serviços vitais precedem o Worker; o Worker recebe preferência operacional sobre aplicativos não essenciais somente dentro da capacidade remanescente. Cada requisição Ollama limita threads de CPU, preservando pelo menos 25% dos processadores lógicos (ou um em máquinas com poucos núcleos), verifica reservas de RAM e, quando mensurável por NVIDIA, VRAM antes de inferir, e aguarda de modo finito sob pressão. Sob pressão de RAM, verifica se o próprio modelo está carregado e o descarrega antes de esgotar a espera; não reduz a reserva do Windows nem encerra aplicações alheias. Após a inferência, pressão de VRAM provoca descarga do modelo, evento auditável e redução adaptativa de camadas na GPU para a próxima chamada; a calibração persiste por modelo e capacidade de GPU enquanto o ambiente for equivalente. O Ollama distribui camadas entre GPU e CPU conforme memória disponível; a instalação contabiliza margem adicional de VRAM no planejamento de carga e preserva valor preexistente maior. Nenhum processo do Worker recebe prioridade de tempo real ou reserva 100% de CPU, RAM ou VRAM. Telemetria distingue espera por recursos de inferência efetiva e explicita quando a VRAM não pode ser medida.
11. Correções devem atingir a causa-raiz e abranger casos equivalentes, com teste da propriedade geral quando viável; ajustes exclusivos do exemplo observado não satisfazem aceitação.

## Inventário, telemetria, retenção e retomada

- O monitor é serviço local idempotente e independente do runner. Sua disponibilidade, navegação, abertura, fechamento e atualização não governam a vida do job. O inventário abrange jobs ativos e terminais retidos, permite filtro por projeto Codex Desktop se essa identidade estiver comprovadamente disponível, senão por raiz Git, e ordena por estado ou criação, ascendente/descendente; o padrão é mais recente primeiro. O detalhe oferece link de volta ao inventário, status, duração, atividade derivada, entrega, timeline cronológica de eventos, erros e bloqueios, tokens de entrada/saída, contexto e custo quando fornecidos pelo runtime. Campo não medido é identificado como indisponível, jamais estimado como fato.
- A telemetria registra apenas eventos operacionais e resumos de raciocínio oficialmente expostos, se houver; nunca depende nem expõe chain-of-thought privado. UI e API atualizam dados sem recarregar a página, limitam volume de resposta, exigem token local e escapam texto não confiável. Preferência por padrões ou componentes open-source maduros é condicional a benefício líquido comprovado frente à solução nativa, sem dependência externa em tempo de execução, vazamento ou consumo material de recursos.
- Cada job possui diretório exclusivo `jobs/<job_id>` validado. Pedido, estado, log, Git, resultado, erro e entrega pertencem somente a essa identidade. Metadados globais separados não podem substituir nem sobrescrever esses artefatos. Retenção configurável remove somente histórico terminal com entrega resolvida, nunca ativo, pendente ou ambíguo; mantém janela temporal, limites de contagem e bytes, com limpeza idempotente, observável e resistente a links/erros isolados. O log operacional por job é limitado por compactação auditável; um teto total de jobs impede crescimento ilimitado caso entregas não resolvidas se acumulem, com diagnóstico e sem apagar essas entregas.
- A entrega direta ao chat na conclusão é o caminho primário, sem polling do supervisor. O watchdog gratuito e o monitor reconciliam anomalias e jobs órfãos sem repetir inferência nem duplicar entrega ambígua. Quinze minutos só é intervalo admissível para verificação que consuma processamento pago do supervisor; a referência gratuita de até três minutos somente vale quando não existir disparo de conclusão. Com o evento direto vigente, não há espera periódica de três minutos na conclusão normal.

## Instalação reproduzível

- `src/` contém a representação generalista de todos os artefatos instaláveis; `src/install.ps1` instala e configura em Windows 11 2025H2+ limpo, com descoberta de caminhos e parâmetros. `howto.md` é o procedimento humano equivalente.
- A preferência automática do Worker é instalada no arquivo global de instruções efetivamente carregado: `AGENTS.override.md` se existir no Codex home, senão `AGENTS.md`. O seletor nativo documentado do Desktop controla modelo e esforço, sem extensão documentada para variantes `+ Worker`; as instruções globais são a alternativa compatível e não alteram o modelo/esforço escolhido.
- O instalador é idempotente: verifica estado antes de alterar, preserva configuração anterior, usa backups e valida cada etapa. Se um método falhar, tenta alternativas tecnicamente equivalentes e seguras. Não altera dados pessoais nem presume usernames, volumes ou roots.
- O registro MCP é verificado semanticamente pelo CLI oficial na instalação e em cada atualização. A falta do registro no `config.toml` ativo é corrigida com backup e revalidação, mesmo quando o runtime já existe. O watchdog já agendado verifica essa disponibilidade e repara a perda posterior sem alterar jobs; registro presente divergente não é sobrescrito. O catálogo inicial do Codex recebe janela suficiente para inicialização do MCP; sessões abertas antes da restauração precisam recarregar o catálogo.
- Se o catálogo de ferramentas de um chat já iniciado não contiver o MCP, `mcp-call.mjs` oferece a mesma chamada JSON-RPC ao `server.mjs` instalado, sem repetir implementação, remover validações nem depender de novo chat. A ponte inicia ou consulta jobs e termina sem encerrar o runner persistente; ela é usada somente como recuperação quando a ferramenta nativa estiver ausente.
- Credenciais, caminhos e repositórios exclusivos do ambiente de desenvolvimento não entram em `src/` ou `howto.md`. Testes reais usam repositório externo autorizado e preservam seu Git.

## Espelhamento e aceitação

- `localworker/` é a implementação testada do runtime; `scripts/sync-src.mjs` replica os artefatos instaláveis para `src/localworker/` e atualiza os blocos gerados deste RCF, de `howto.md` e de `src/README.md`. O hook de pré-commit exige espelhos e documentação consistentes, ausência de dados locais exclusivos e sintaxe válida.
- A representação do supervisor em `src/agents.supervisor.md` preserva a norma global; `src/agents.worker.md` representa `localworker/AGENTS.md`. O instalador aplica essas instruções sem apagar instruções existentes não geridas.
- Aceitação requer instalação em destino isolado/limpo, validação da configuração MCP, testes de sucesso, escrita, falha, recuperação e não regressão Git. Provas de UI real distinguem-se de testes simulados. Cada unidade coerente concluída recebe commit próprio e push imediato ao remote correto.

<!-- LOCALWORKER_GENERATED_START -->
Gerado por `node scripts/sync-src.mjs --write` a partir dos artefatos testados. Os SHA-256 permitem conferir a distribuição sem caminhos locais.

Configuração padrão: modelo `qwen3-coder-next-32k`; Ollama `http://127.0.0.1:11434`; `timeout_ms=0` (sem teto temporal total); 40 passos por segmento de contexto; 4 tentativas transitórias.

| Artefato portável | SHA-256 |
| --- | --- |
| `src/localworker/AGENTS.md` | `4904e38fa2b9e60d09a2b0231e92e8b204211568a6bb796a462553ac48d129c8` |
| `src/localworker/config.json` | `6147e1cfe3ef123def81c529b9d8b30f7771834ff15bf7333bbd1704ce96d1aa` |
| `src/localworker/package.json` | `27a6750c9ce0bb5d65ff7034a7010c29a07df210b9c769532a18c52ecc39c953` |
| `src/localworker/package-lock.json` | `1c1f7f1e2c68af0041ea911237d1dee9ff36bc604f3a7c52ba75de470110b91f` |
| `src/localworker/server.mjs` | `263606fe58785410d0c4402e89dfcd291a7556a1ce39515b3401048e94aa1828` |
| `src/localworker/thread-check.mjs` | `83683a14a1f451f20d2761eac851522241e870366b1b25be2582ccfeacddbb79` |
| `src/localworker/job-store.mjs` | `45654c33a7955d24fa38cc083c7691f01c1af48a6116a581ceb1108287fc4672` |
| `src/localworker/worker-core.mjs` | `279ac44e7e091a10bc1c98e76272128bcef9dba1508bfc4f9d4796c51c0c7b57` |
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
| `src/agents.supervisor.md` | `4e80984b0221ee269ca7c3f2f5142f6a819e244bc9c4af75c95f2eb1cdd5858e` |
<!-- LOCALWORKER_GENERATED_END -->
