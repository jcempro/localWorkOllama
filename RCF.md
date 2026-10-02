# RCF — localWorker para Codex Desktop

## Objetivo

O localWorker executa tarefas delegáveis em inferência Ollama local, com jobs persistentes, resultado verificável e retomada do mesmo chat no Codex Desktop. A seleção de modelo e esforço do supervisor permanece independente. `AGENTS.md` e `agents.local.md` governam a atuação; este RCF define o produto e seus contratos.

## Arquitetura vigente

1. O MCP `localworker` recebe `repoPath` absoluto, `thread_id` do chat atual, tarefa e modo `read-only` ou `write`; `write` exige autorização. Comandos adicionais são exatos e pré-aprovados. `expect_changes` exige alteração líquida; `required_change_paths` exige mudança em cada alvo relativo conhecido, inclusive se houver alterações preexistentes em outros arquivos.
2. O servidor valida identidade do chat, diretório, escopo e bloqueio de autouso antes de criar job. Um runner persiste estado, resultado, log, Git determinístico, latência e classificação de falhas. O watchdog recupera jobs interrompidos e entregas pendentes.
3. A conclusão é enviada por `codex queue` ao mesmo `thread_id`. O caminho do CLI é descoberto novamente na entrega. Erro comprovadamente anterior ao envio pode ser recuperado uma vez; estado ambíguo não permite duplicação automática.
4. O Worker dispõe de leitura, busca, status/diff Git e, quando autorizado, escrita, edição, movimentação sem sobrescrita, exclusão com backup recuperável e comandos delimitados. `git_status` explicita upstream e contagens determinísticas de commits à frente/atrás; arquivo modificado no working tree não implica commit não enviado. Confinamento por caminho real e regras aplicáveis do repositório são obrigatórios.
5. O supervisor consulta o resultado uma vez após retomada, revisa riscos e evidência proporcionalmente e continua unidades pendentes; término da inferência não prova conclusão da solicitação.
6. Cada delegação fornece `monitor_url` local autenticado. O monitor HTTP liga somente em `127.0.0.1`, corre em processo separado e lê telemetria persistida; abrir ou fechar a página não afeta o runner. Ele mostra fase, ferramentas, recursos acessados, tempos, contadores de progresso, uso observável de CPU/memória/GPU, erros e entrega. Não expõe raciocínio interno nem conteúdo de arquivos. `local_status` também expõe atividade derivada.
7. `RUNNING` é estado formal, não prova de processamento ativo. Heartbeat, PID, último evento, espera por Ollama e uso observável de recursos distinguem `ACTIVE`, `WAITING_MODEL`, `WAITING`, `STALLED_SUSPECTED`, `STALLED`, `ORPHANED` e `TERMINAL_NOT_PROPAGATED`. GPU indisponível torna estagnação uma suspeita explicitada. O watchdog, o monitor independente e as consultas de estado/resultado reconciliam runner desaparecido, preservam alterações parciais, registram Git determinístico e entregam o diagnóstico sem duplicar inferência.
8. Em escrita obrigatória, o Worker recebe alertas de orçamento antes do limite, deixa de receber ferramentas de listagem ampla na metade dos ciclos e rejeita consultas idênticas recorrentes. Esgotamento de ciclos é `WORKER_INCOMPLETE`, com contagem de mutações e ferramentas, nunca falha de transporte. Isso exige correção de segmentação/estratégia antes de nova delegação.
9. O transporte HTTP do Ollama usa o prazo total explícito do job, sem timeout implícito de cabeçalho de cinco minutos. Falhas transitórias de conexão recebem tentativas limitadas. A saída padrão e de erro de comandos autorizados falhos é devolvida de forma limitada ao Worker para diagnóstico; o monitor recebe apenas resumo operacional.
10. Recursos do SO e serviços vitais precedem o Worker; o Worker recebe preferência operacional sobre aplicativos não essenciais somente dentro da capacidade remanescente. Cada requisição Ollama limita threads de CPU, preservando pelo menos 25% dos processadores lógicos (ou um em máquinas com poucos núcleos), verifica reservas de RAM e, quando mensurável por NVIDIA, VRAM antes de inferir, e aguarda de modo finito sob pressão. Após a inferência, pressão de VRAM provoca descarga do modelo, evento auditável e redução adaptativa de camadas na GPU para a próxima chamada; a calibração persiste por modelo e capacidade de GPU enquanto o ambiente for equivalente. O Ollama distribui camadas entre GPU e CPU conforme memória disponível; a instalação contabiliza margem adicional de VRAM no planejamento de carga e preserva valor preexistente maior. Nenhum processo do Worker recebe prioridade de tempo real ou reserva 100% de CPU, RAM ou VRAM. Telemetria distingue espera por recursos de inferência efetiva e explicita quando a VRAM não pode ser medida.
11. Correções devem atingir a causa-raiz e abranger casos equivalentes, com teste da propriedade geral quando viável; ajustes exclusivos do exemplo observado não satisfazem aceitação.

## Inventário, telemetria, retenção e retomada

- O monitor é serviço local idempotente e independente do runner. Sua disponibilidade, navegação, abertura, fechamento e atualização não governam a vida do job. O inventário abrange jobs ativos e terminais retidos, permite filtro por projeto Codex Desktop se essa identidade estiver comprovadamente disponível, senão por raiz Git, e ordena por estado ou criação, ascendente/descendente; o padrão é mais recente primeiro. O detalhe oferece link de volta ao inventário, status, duração, atividade derivada, entrega, timeline cronológica de eventos, erros e bloqueios, tokens de entrada/saída, contexto e custo quando fornecidos pelo runtime. Campo não medido é identificado como indisponível, jamais estimado como fato.
- A telemetria registra apenas eventos operacionais e resumos de raciocínio oficialmente expostos, se houver; nunca depende nem expõe chain-of-thought privado. UI e API atualizam dados sem recarregar a página, limitam volume de resposta, exigem token local e escapam texto não confiável. Preferência por padrões ou componentes open-source maduros é condicional a benefício líquido comprovado frente à solução nativa, sem dependência externa em tempo de execução, vazamento ou consumo material de recursos.
- Cada job possui diretório exclusivo `jobs/<job_id>` validado. Pedido, estado, log, Git, resultado, erro e entrega pertencem somente a essa identidade. Metadados globais separados não podem substituir nem sobrescrever esses artefatos. Retenção configurável remove somente histórico terminal com entrega resolvida, nunca ativo, pendente ou ambíguo; mantém janela temporal e limite de contagem, com limpeza idempotente, observável e resistente a links/erros isolados.
- A entrega direta ao chat na conclusão é o caminho primário, sem polling do supervisor. O watchdog gratuito e o monitor reconciliam anomalias e jobs órfãos sem repetir inferência nem duplicar entrega ambígua. Quinze minutos só é intervalo admissível para verificação que consuma processamento pago do supervisor; a referência gratuita de até três minutos somente vale quando não existir disparo de conclusão. Com o evento direto vigente, não há espera periódica de três minutos na conclusão normal.

## Instalação reproduzível

- `src/` contém a representação generalista de todos os artefatos instaláveis; `src/install.ps1` instala e configura em Windows 11 2025H2+ limpo, com descoberta de caminhos e parâmetros. `howto.md` é o procedimento humano equivalente.
- O instalador é idempotente: verifica estado antes de alterar, preserva configuração anterior, usa backups e valida cada etapa. Se um método falhar, tenta alternativas tecnicamente equivalentes e seguras. Não altera dados pessoais nem presume usernames, volumes ou roots.
- Credenciais, caminhos e repositórios exclusivos do ambiente de desenvolvimento não entram em `src/` ou `howto.md`. Testes reais usam repositório externo autorizado e preservam seu Git.

## Espelhamento e aceitação

- `localworker/` é a implementação testada do runtime; `scripts/sync-src.mjs` replica os artefatos instaláveis para `src/localworker/` e atualiza os blocos gerados deste RCF, de `howto.md` e de `src/README.md`. O hook de pré-commit exige espelhos e documentação consistentes, ausência de dados locais exclusivos e sintaxe válida.
- A representação do supervisor em `src/agents.supervisor.md` preserva a norma global; `src/agents.worker.md` representa `localworker/AGENTS.md`. O instalador aplica essas instruções sem apagar instruções existentes não geridas.
- Aceitação requer instalação em destino isolado/limpo, validação da configuração MCP, testes de sucesso, escrita, falha, recuperação e não regressão Git. Provas de UI real distinguem-se de testes simulados. Cada unidade coerente concluída recebe commit próprio e push imediato ao remote correto.

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
