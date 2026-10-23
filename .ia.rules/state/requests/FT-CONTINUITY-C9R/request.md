# PROMPT BLOQUEANTE — RETOMADA AUTOMÁTICA · DISTINÇÃO CAUSAL × INTERRUPÇÃO INTENCIONAL · SEM REGRESSÕES

**CONTINUE a implementação atual.** Somente depois, Investigue e corrija cirurgicamente a regressão da retomada automática, preservando integralmente os comportamentos legítimos existentes.

**REGRA CENTRAL:** interrupção por **esgotamento de recursos/limites do ChatGPT** NÃO equivale a encerramento voluntário. Uma solicitação legitimamente iniciada e ainda pendente **DEVE ser retomada automaticamente quando os recursos forem restabelecidos**, salvo se o usuário a tiver **interrompido, cancelado, encerrado ou desativado manual e intencionalmente**.

**Distinções obrigatórias:**
1. **Suspensão causal:** esgotamento de recursos, limites ou impedimentos temporários involuntários → preservar a solicitação pendente e retomar automaticamente quando possível, sem exigir nova autorização, desde que seu contexto de execução continue legitimamente ativo.
2. **Interrupção voluntária:** cancelamento, encerramento ou desligamento manual/intencional pelo usuário → respeitar a decisão; **NÃO retomar sem nova autorização explícita**.
3. **Inicialização do Windows/OS:** **NUNCA constitui autorização para retomar solicitações antigas**, mesmo que pendentes ou anteriormente interrompidas. Iniciar o sistema, serviço ou aplicativo NÃO DEVE disparar execuções automaticamente à revelia do usuário.

**IMPLEMENTAÇÃO:** inspecionar o estado real, identificar a causa raiz da regressão e distinguir corretamente **motivo da interrupção, estado da solicitação e autorização vigente**. Corrigir somente os mecanismos necessários, sem presumir arquitetura, criar gatilhos indevidos ou eliminar a retomada legítima para impedir a ilegítima.

**VALIDAÇÃO BLOQUEANTE:** testar exaustão→restabelecimento→retomada; cancelamento/desligamento manual→não retomada; inicialização/reinicialização do OS→nenhuma execução não autorizada; além de concorrência, duplicações, estados pendentes, persistência aplicável e idempotência. **É PROIBIDO confundir inicialização do sistema com restabelecimento de recursos ou interpretar suspensão causal como cancelamento.**

**ACEITE:** retomada automática funcional para solicitações efetivamente em andamento, respeito absoluto às interrupções intencionais, nenhuma execução espontânea no boot, nenhuma regressão ou falso sucesso. Corrigir a causa raiz, implementar e comprovar os comportamentos por testes reais, sem alterar normas para justificar divergências.
