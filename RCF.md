# RCF — localWorker para Codex Desktop

## Objetivo

O localWorker executa tarefas delegáveis em inferência Ollama local, com jobs persistentes, resultado verificável e retomada do mesmo chat no Codex Desktop. A seleção de modelo e esforço do supervisor permanece independente. `AGENTS.md` e `agents.local.md` governam a atuação; este RCF define o produto e seus contratos.

## Arquitetura vigente

1. O MCP `localworker` recebe `repoPath` absoluto, `thread_id` do chat atual, tarefa e modo `read-only` ou `write`; `write` exige autorização. Comandos adicionais são exatos e pré-aprovados. `expect_changes` em escrita impede que ausência de edição seja anunciada como conclusão.
2. O servidor valida identidade do chat, diretório, escopo e bloqueio de autouso antes de criar job. Um runner persiste estado, resultado, log, Git determinístico, latência e classificação de falhas. O watchdog recupera jobs interrompidos e entregas pendentes.
3. A conclusão é enviada por `codex queue` ao mesmo `thread_id`. O caminho do CLI é descoberto novamente na entrega. Erro comprovadamente anterior ao envio pode ser recuperado uma vez; estado ambíguo não permite duplicação automática.
4. O Worker dispõe de leitura, busca, status/diff Git e, quando autorizado, escrita, edição, movimentação sem sobrescrita, exclusão com backup recuperável e comandos delimitados. Confinamento por caminho real e regras aplicáveis do repositório são obrigatórios.
5. O supervisor consulta o resultado uma vez após retomada, revisa riscos e evidência proporcionalmente e continua unidades pendentes; término da inferência não prova conclusão da solicitação.

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
