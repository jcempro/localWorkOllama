# F8E — consolidação determinística das falhas capturadas

Unidade interna deste construtor, exclusivamente para auditoria privada. O supervisor implementou e validou o coletor em C=8; a posterior execução mecânica pode ser delegada com escopo/comando exatos e contrato próprio. Não instala ou altera runtime, normas distribuídas, modelo, permissões ou resultados de negócio.

`collectFailureEvidenceF8E(captureText, profilesText)`, em `audit-failure-evidence.mts`, reutiliza A3F e E6T. Os argumentos são JSON UTF-8 da captura e dos perfis existentes. O chamador verifica seus hashes esperados e define saída exclusiva, sem sobrescrita. A função não faz IO. Uso com Node22.21.0: importar em script `.mts`, executar com `node --experimental-strip-types`. Seleção de fases/campos fica centralizada no topo; limites dos recortes são os de E6T. Caminhos e IDs de ambiente não integram o módulo.

Todos os IDs dos perfis são vinculados à captura, conferindo identidade única e status correspondente; ausentes, duplicados, cancelados ou divergentes interrompem a projeção. Somente `FAILED` integra a saída. O contrato do pedido e a tarefa são mantidos integralmente. São projetados metadados explícitos de ações/resultados/bloqueios e erros de parse; eventos omitidos são contados. Não copia conteúdo privado de raciocínio. Erro/resultado têm recortes verificáveis com omissões; comandos autorizados completos não são incluídos. Essas limitações acompanham a saída.

Não é classificador de causas, risco ou aceite: todos os registros continuam `NOT_ASSESSED`. Não executar novamente os jobs, não reconstruir conteúdo ausente e não usar ausência de evento como prova absoluta de ausência de efeito. O método substitui inferência desnecessária para coletar fatos, mantendo revisão e decisão no supervisor. O parecer do segmento32 demonstrou que citações exatas não impedem conclusões incorretas.

Validação: `node --experimental-strip-types --test constructor/audit-failure-evidence.test.mts constructor/audit-evidence-excerpt.test.mts`: oito testes passaram. Os três novos grupos cobrem vínculo/status/identidade, contratos completos, filtragem explícita, exclusão de raciocínio privado, não mutação, determinismo, hashes e recusa de entrada inválida. A execução sobre a captura real é etapa separada; seu recibo deve registrar hashes, contagens e o fato de não ter ocorrido inferência.

## Recibo real conferido

Job625696e0-715b-4044-84ec-4aa405942f2c: resultado obtido uma vez, comando `collect_failures` exit0, stderr vazio, zero chamadas de inferência. Vínculo dos189 perfis conferido;46 registros `FAILED` projetados, todos `NOT_ASSESSED`. SHA256 do arquivo privado `failures.json`: `97b40188121c2267e155d253879f43ba4ec9be6e7d71f9cce9f0ccb170c00a58`, conferido pelo supervisor. Hashes de entrada correspondem aos selados no pedido. Não houve implementação exigida nem commit do Worker.

Git determinístico do job em23/10/2026 às12:49:02 UTC: `main...origin/main` limpo. Isso corresponde à coleta privada ignorada; não substitui os estados históricos dos jobs coletados. `QUEUED_TO_CHAT` comprova enfileiramento; o presente checkpoint registra a consulta/revisão efetiva.

## Projeção dos registros concluídos

`collectCompletionEvidenceF8E(captureText, profilesText)` reutiliza o mesmo núcleo, com seleção separada de `COMPLETED`, schema `audit-completion-evidence/v1` e contador `completed_jobs`. A API anterior continua selecionando somente falhas, com o mesmo schema, contador e metadados; nenhum dado antigo é convertido ou regravado.

A nova projeção preserva também eventos `completion_blocked` e `completion_verified`, com linhas, leituras, comandos, mutações, commits, política e ressalva de verificação operacional. Bloqueio anterior não significa pendência final quando há conclusão posterior. Resultados textuais continuam sujeitos aos recortes E6T e a truncamentos anteriores da captura; `NOT_ASSESSED` permanece para qualidade semântica.

Validação da extensão: a mesma suíte passou com nove testes, incluindo o novo caso de bloqueio anterior/conclusão posterior, preservação de recibo, seleção isolada e compatibilidade da API antiga. A execução sobre os142 registros concluídos do incremento é unidade posterior; não inferir seu aceite por essa contagem.

Recibo real622f02c0-c347-40fc-bb66-0743997f45c3 obtido uma vez: `collect_completions` exit0, stderr vazio, inferência0. SHA256 da saída privada `completions.json`: `35fb663c20ad43f483d1764672a869c1e0e64b143141cf97acb0e900e004bca4`, conferido;189 perfis vinculados e142COMPLETED. Todos os142 têm `completion_verified`; a comparação mecânica das leituras/comandos declarados não encontrou omissões nesses recibos. Os72 com alteração exigida registram mutações. Dois contêm bloqueios anteriores à conclusão. Isso não demonstra conteúdo correto, ausência de regressão ou aceite posterior.

Git determinístico do coletor em23/10/2026 às12:58:09 UTC: `main...origin/main` limpo, coerente com coleta ignorada e commit pelo supervisor. Não houve exigência de implementação no job; a extensão funcional foi versionada anteriormente em75945c4.
