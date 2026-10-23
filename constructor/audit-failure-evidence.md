# F8E — consolidação determinística das falhas capturadas

Unidade interna deste construtor, exclusivamente para auditoria privada. O supervisor implementou e validou o coletor em C=8; a posterior execução mecânica pode ser delegada com escopo/comando exatos e contrato próprio. Não instala ou altera runtime, normas distribuídas, modelo, permissões ou resultados de negócio.

`collectFailureEvidenceF8E(captureText, profilesText)`, em `audit-failure-evidence.mts`, reutiliza A3F e E6T. Os argumentos são JSON UTF-8 da captura e dos perfis existentes. O chamador verifica seus hashes esperados e define saída exclusiva, sem sobrescrita. A função não faz IO. Uso com Node22.21.0: importar em script `.mts`, executar com `node --experimental-strip-types`. Seleção de fases/campos fica centralizada no topo; limites dos recortes são os de E6T. Caminhos e IDs de ambiente não integram o módulo.

Todos os IDs dos perfis são vinculados à captura, conferindo identidade única e status correspondente; ausentes, duplicados, cancelados ou divergentes interrompem a projeção. Somente `FAILED` integra a saída. O contrato do pedido e a tarefa são mantidos integralmente. São projetados metadados explícitos de ações/resultados/bloqueios e erros de parse; eventos omitidos são contados. Não copia conteúdo privado de raciocínio. Erro/resultado têm recortes verificáveis com omissões; comandos autorizados completos não são incluídos. Essas limitações acompanham a saída.

Não é classificador de causas, risco ou aceite: todos os registros continuam `NOT_ASSESSED`. Não executar novamente os jobs, não reconstruir conteúdo ausente e não usar ausência de evento como prova absoluta de ausência de efeito. O método substitui inferência desnecessária para coletar fatos, mantendo revisão e decisão no supervisor. O parecer do segmento32 demonstrou que citações exatas não impedem conclusões incorretas.

Validação: `node --experimental-strip-types --test constructor/audit-failure-evidence.test.mts constructor/audit-evidence-excerpt.test.mts`: oito testes passaram. Os três novos grupos cobrem vínculo/status/identidade, contratos completos, filtragem explícita, exclusão de raciocínio privado, não mutação, determinismo, hashes e recusa de entrada inválida. A execução sobre a captura real é etapa separada; seu recibo deve registrar hashes, contagens e o fato de não ter ocorrido inferência.

## Recibo real conferido

Job625696e0-715b-4044-84ec-4aa405942f2c: resultado obtido uma vez, comando `collect_failures` exit0, stderr vazio, zero chamadas de inferência. Vínculo dos189 perfis conferido;46 registros `FAILED` projetados, todos `NOT_ASSESSED`. SHA256 do arquivo privado `failures.json`: `97b40188121c2267e155d253879f43ba4ec9be6e7d71f9cce9f0ccb170c00a58`, conferido pelo supervisor. Hashes de entrada correspondem aos selados no pedido. Não houve implementação exigida nem commit do Worker.

Git determinístico do job em23/10/2026 às12:49:02 UTC: `main...origin/main` limpo. Isso corresponde à coleta privada ignorada; não substitui os estados históricos dos jobs coletados. `QUEUED_TO_CHAT` comprova enfileiramento; o presente checkpoint registra a consulta/revisão efetiva.
