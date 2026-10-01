# RCF — localWorker para Codex Desktop

## Objetivo

O localWorker executa tarefas delegáveis em inferência Ollama local, com jobs persistentes, resultado verificável e retomada do mesmo chat no Codex Desktop. A seleção de modelo e esforço do supervisor permanece independente. `AGENTS.md` e `agents.local.md` governam a atuação; este RCF define o produto e seus contratos.

## Arquitetura vigente

1. O MCP `localworker` recebe `repoPath` absoluto, `thread_id` do chat atual, tarefa e modo `read-only` ou `write`; `write` exige autorização. Comandos adicionais são exatos e pré-aprovados. `expect_changes` em escrita impede que ausência de edição seja anunciada como conclusão.
2. O servidor valida identidade do chat, diretório, escopo e bloqueio de autouso antes de criar job. Um runner persiste estado, resultado, log, Git determinístico, latência e classificação de falhas. O watchdog recupera jobs interrompidos e entregas pendentes.
3. A conclusão é enviada por `codex queue` ao mesmo `thread_id`. O caminho do CLI é descoberto novamente na entrega. Erro comprovadamente anterior ao envio pode ser recuperado uma vez; estado ambíguo não permite duplicação automática.
4. O Worker dispõe de leitura, busca, status/diff Git e, quando autorizado, escrita, edição, movimentação sem sobrescrita, exclusão com backup recuperável e comandos delimitados. Confinamento por caminho real e regras aplicáveis do repositório são obrigatórios.
5. O supervisor consulta o resultado uma vez após retomada, revisa riscos e evidência proporcionalmente e continua unidades pendentes; término da inferência não prova conclusão da solicitação.
6. Cada delegação fornece `monitor_url` local autenticado. O monitor HTTP liga somente em `127.0.0.1`, corre em processo separado e lê telemetria persistida; abrir ou fechar a página não afeta o runner. Ele mostra fase, ferramentas, recursos acessados, tempos, contadores de progresso, uso observável de CPU/memória/GPU, erros e entrega. Não expõe raciocínio interno nem conteúdo de arquivos. `local_status` também expõe atividade derivada.
7. `RUNNING` é estado formal, não prova de processamento ativo. Heartbeat, PID, último evento, espera por Ollama e uso observável de recursos distinguem `ACTIVE`, `WAITING_MODEL`, `WAITING`, `STALLED_SUSPECTED`, `STALLED`, `ORPHANED` e `TERMINAL_NOT_PROPAGATED`. GPU indisponível torna estagnação uma suspeita explicitada. O watchdog restaura estado terminal a partir de artefato persistido quando o runner desaparece.
8. Em escrita obrigatória, o Worker recebe alertas de orçamento antes do limite, deixa de receber ferramentas de listagem ampla na metade dos ciclos e rejeita consultas idênticas recorrentes. Esgotamento de ciclos é `WORKER_INCOMPLETE`, com contagem de mutações e ferramentas, nunca falha de transporte. Isso exige correção de segmentação/estratégia antes de nova delegação.

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
| `src/localworker/AGENTS.md` | `9e7fefc62c38fbca9d33435c6f1a41e314cf88925cf940902c7d396ecb35520b` |
| `src/localworker/config.json` | `6128724ed765dcb78cbc457bac81ee7257ffb11dc196ec3730b5e1a605ddd3c7` |
| `src/localworker/package.json` | `27a6750c9ce0bb5d65ff7034a7010c29a07df210b9c769532a18c52ecc39c953` |
| `src/localworker/package-lock.json` | `1c1f7f1e2c68af0041ea911237d1dee9ff36bc604f3a7c52ba75de470110b91f` |
| `src/localworker/server.mjs` | `92e74f98548af2424666118413dcc0055ca8ebda63c49a34dadd0c15e8ced68b` |
| `src/localworker/thread-check.mjs` | `83683a14a1f451f20d2761eac851522241e870366b1b25be2582ccfeacddbb79` |
| `src/localworker/job-store.mjs` | `d30240c99c6c4f3832c577a3ccc55c49c84807617dc8b1c2d657b62797dfa497` |
| `src/localworker/worker-core.mjs` | `36bfebbdc96fbc09860f100dcebbc2af0f8e0ff22de80d2ef6c323e302484ef9` |
| `src/localworker/worker-runner.mjs` | `8200deda2117eab2ad19dc048ba128ab00d6a93c9c575aca5c73904fa9645cf9` |
| `src/localworker/delivery.mjs` | `d02c74839dcf59292c88f1124113b2fa08b4ad8f1413c888f562b0cb0d631674` |
| `src/localworker/watchdog.mjs` | `2fe0b9e1a852cf5c787f6a8311b780348714f705f14d42925a6ee8c325de7024` |
| `src/localworker/monitor.mjs` | `b24b452a274fcf41cae4e98bea79c07bf3cae58e837b6985f7d7773ff8e009ba` |
| `src/localworker/notify.ps1` | `013280cd736de251f2e687f61fb3a83bbb6c9ee83a08eeec67cc22b9adef66cc` |
| `src/localworker/install.ps1` | `4d4beeb08f5d9faa50f9d2a720d6a89b023d6cab7412eb2a0b3a3aca644685dd` |
| `src/localworker/update-installed.ps1` | `8777979eedf9d8c6e0bbc3665da9d008fa58392da27e3c9b24e04ca78df58546` |
| `src/localworker/register-watchdog.ps1` | `d78fa380059112826d061097c4138bcbcabc369a6888d6a875cda649bcad3efb` |
| `src/install.ps1` | `34dbaab7cb7fdfdb1caae911691d44a13d95cab421f9336761d5e1ce74367b80` |
| `src/agents.supervisor.md` | `645816c550ae50adb49fb79093d407fa0acf394c6f2f66d03937db468c23d694` |
<!-- LOCALWORKER_GENERATED_END -->
