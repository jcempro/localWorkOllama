# T3P — validação proporcional do callback

Supervisor C8/exclusivo; nenhum Worker empregado para manutenção ou testes desta correção global. Fonte/contrato: callback-execution-plan.md, RCF e norma global. Retomada SR-001 conserva seu aceite por recebimento/resposta real; o término técnico descrito aqui é somente do job Worker.

## Código e teste

delivery.mts é a fonte canônica; delivery.mjs é gerado pelo sync-src existente. Seleções positivas de instalação, atualização, recuperação e prova incluem ambos. Nenhum fluxo de entrega, autorização, fila, timer, recurso/modelo/esforço ou estado foi alterado. O monitor não importa delivery: não há motivo para modificar seu código/identidade por esta unidade. Processo MCP já aberto pode manter módulo antigo; ponte instalada/runner novo carregam arquivos atuais, sem reabrir Desktop.

Teste real no Node22.21: `node --experimental-strip-types constructor/test-delivery-message.mts e98bac3 <git-exe-absoluto-descoberto>`, resultado T3P_CALLBACK_MESSAGE_OK. Comparação com baseline explícita permite somente a troca da frase, normalizando apenas EOL e espaços finais como no gerador. Equivalência fonte→artefato conferida pelo stripTypeScriptTypes real. queueMessage testado como função para COMPLETED e FAILED, preservando job_id, consulta única, Q8S, Git determinístico, recuperação e SW-HYBRID. Zero envios, jobs, inferências ou callbacks efetivamente disparados por esse teste. Isso não é ensaio de UI/retomada e não altera limitações S2Q/N7C.

Sincronização:50 artefatos, sem valores privados em src/howto. Fonte, instaladores e espelhos generalistas coerentes. Instalação real e prova de cópias/configurações/autorizações ainda pendentes neste checkpoint; não declarar aceite integral antes delas. Não é necessário repetir testes de inferência, exclusão ou cancelamento: a comparação de código demonstra que essa lógica permaneceu idêntica.

## Impedimento de autodescoberta — U4M

A primeira instalação interrompeu no primeiro Get-FileHash, antes de invocar instaladores/cópias. Processo5.1 herdava caminhos de módulos7 antes dos nativos; autodescoberta falhou, mas importação explícita disponibilizou o comando. A seleção implícita carregou Utility7; priorizar nativo selecionou Utility3.1. Não se afirma causa interna adicional do carregador. Os dois scripts dependentes agora importam Utility pelo PSHOME real e conferem Get-FileHash antes de efeitos, sem mudar ambiente global.

Teste real `constructor/test-native-utility.mts <powershell-exe-descoberto> <pwsh-exe-descoberto>`: NATIVE_UTILITY_U4M_OK, oito casos (dois preâmbulos×duas edições×autoload All/None), SHA-256 igual ao Node. Apenas preâmbulos extraídos da fonte foram executados. Management foi previamente carregado para fornecer Resolve-Path exigido internamente pelo Get-FileHash5.1 no cenário artificial sem autoload. O teste não executa instaladores nem simula instalação completa. Correção mínima de dependência versionada em db3d95f; prova da instalação abaixo.

## Instalação real concluída

Em2026-10-23T19:53:21.418Z, fluxo oficial install-causal-resume.ps1 em Windows PowerShell5.1 retornou C9R_INSTALLED_HASHES_VERIFIED_AUTHORIZATION_PRESERVED. Prova nova, posterior ao início da tentativa, SHA256 **09bf14ef0cef112ecfbc4b161702780ceddf41c1c797b1b6ba87ed73528c5ecd**, preservada em audit-private/t3p-install-c61d21f7-9e5d-4df9-8a4a-2870b015954d/installed-proof.json. Vinte artefatos do Worker, oito arquivos do supervisor e manifestos de recuperação das duas instalações conferidos contra src. delivery.mts/mjs conferidos também por bytes SHA-256. Configuração do Worker preservada pelo contrato existente; config.toml global inalterado.

GlobalRulesOnly concluiu e o corpo instalado é igual a src/agents.supervisor.md; prefixo/sufixo externos aos marcadores preservados. Continuidade desta conversa permaneceu ACTIVE/EXPLICIT_RESUME e a do alvo de teste PAUSED/EXPLICIT_PAUSE, hashes dos controles inalterados. Ausentes triggers boot/logon, WakeToRun e StartWhenAvailable. Zero envios reais, jobs de teste, inferências ou retomadas por esta validação. Resumo privado t3p-installed-summary.json. Processos já abertos podem manter módulos anteriores; não foram reiniciados nem reabertos para forçar adoção.

**Aceite T3P concluído no escopo declarado.** Isso não comprova compactação nativa S2Q/N7C nem conclui a auditoria histórica. A limitação de acionamento nativo permanece documentada e não autoriza repetir mensagens pela fila.
