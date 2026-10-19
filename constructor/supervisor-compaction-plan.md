# FT-SUPERVISOR-COMPACT-N7C — regra global e capacidade real

Fonte integral: .ia.rules/state/requests/FT-SUPERVISOR-COMPACT-N7C/prompt.md. Escopo: supervisor que delega a qualquer Worker/repositório, nunca compactação do Ollama. Ordem obrigatória: recibo efetivo RUNNING → checkpoint operativo mínimo → aviso com job_id/links no chat → compactação nativa do próprio contexto como última ação operacional → encerramento. Nenhuma ativação de interface, chat ou job por boot/fechamento; nenhum polling ou reinício. Complementação humana confirma UI `/compactar` e alcance global.

Supervisor fixa C=8, exclusivo: instrução global afeta preservação de contexto e futuras operações em todos os repositórios; não delegar esta avaliação ou manutenção ao Worker. Fonte atual e parcial audit-facts.mts ficam preservadas. Não usar job de negócio como teste da regra.

## Capacidades verificadas e limite

Documentação oficial: https://learn.chatgpt.com/docs/app-server, método thread/compact/start; resposta {} é aceite de início, confirmação usa contextCompaction/item/completed da mesma conversa. CLI instalado expõe esse schema e ThreadTokenUsageUpdatedNotification (last/total/modelContextWindow). A captura humana confirma botão Compactar com percentual; não há dúvida sobre existência da UI.

Catálogo desta sessão não contém compactação. read_thread expõe identidade/status, não uso contextual. No CODEX_HOME real, socket app-server-control ausente (ENOENT confirmado fora do sandbox); proxy oficial não conectou. Não criar/resumir uma cópia em outro app-server para editar o histórico de uma conversa ativa. A skill Computer Use proíbe automatizar a UI do ChatGPT Desktop; não contorná-la por outra automação de UI. Essas limitações não negam a capacidade manual da UI e não autorizam falso sucesso.

## Exceção e custo

Somente medida atual e autoritativa vinculada à conversa permite exceção estrita <10%; 10% não dispensa. Reutilizar telemetria já exposta pelo runtime tem custo incremental desprezível e benefício de evitar compactação desnecessária. Não há getter desse percentual nas ferramentas acessíveis desta sessão. SQLite expõe tokens_used sem denominador de janela ativa: não é percentual. Não varrer histórico, contar caracteres, chamar modelo/API, abrir UI nem iniciar watcher para fabricar a exceção; o custo/risco excede o benefício. A exceção fica normatizada condicionalmente, sem medição/dispensa automática alegada nesta instalação.

## Entrega verificável

Implementar regra em RCF, fonte global do supervisor, governança local de distribuição e howto; sincronizar e instalar pelo GlobalRulesOnly, que não altera runtime/modelo/tarefas/jobs. Validar preservação do conteúdo externo ao bloco global e das configurações. Esta entrega torna a obrigação global; não instala uma ferramenta nativa ausente. Execução automática e ordem temporal continuam não demonstráveis neste cliente até expor um acionamento suportado ligado ao contexto vivo. Registrar impedimento explícito, sem transformar resumo em arquivo, texto `/compactar` ou fila em compactação nativa. Não declarar aceite operacional integral.
