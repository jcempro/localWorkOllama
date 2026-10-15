# FT-INSTALL-STDIN-P5N — validação

Execução exclusiva do supervisor, C=8; plano e causa comprovada em `powershell-node-transport-plan.md`. Três invocações existentes passam o mesmo código estático por stdin, mantendo cwd, configuração via ambiente e códigos de saída. Não se removeu activeJob, descoberta Codex nem prova de autenticação/identidade.

`constructor/test-powershell-node-transport.ps1` passou em Windows PowerShell **5.1.26100.9549** e PowerShell **7.6.6**, no Node instalado 22.21.0. Executou o atualizador real contra fixture isolada com path contendo espaço: RUNNING recusado antes da cópia; COMPLETED ultrapassou a guarda e parou na pré-condição de configuração ausente; estados/índice válidos preservados e nenhum runtime copiado. Aspas e string vazia preservadas no transporte. A fixture foi removida somente após confirmar raiz e ausência de reparse point. Teste não cria chats, serviços ou tarefas agendadas.

Instalação real e cópias de recuperação ainda pendentes neste checkpoint; os testes isolados não simulam prova de autenticação real nem disponibilidade universal do cliente.
