# Fonte humana — FT-SUPERVISOR-SEQUENCE-S2Q

Origem: solicitação de23/10/2026 no chat corrente; captura visual é exemplo de uma retomada contextualizada. Não autoriza repetir o job citado nela. Texto integral do pedido:

continue e para te auxiliar no quesito de 'compactar' considere:
# PROMPT BLOQUEANTE — COMPACTAÇÃO E CONTINUAÇÃO SEQUENCIAL · SEM REGRESSÕES

No gestor Supervisor–Worker local, ajuste cirurgicamente os fluxos de **retomada e continuação** que necessitem de `/compactar`, sem presumir arquitetura, infraestrutura ou mecanismos existentes.

**CONTRATO:** para compactar e prosseguir, enviar **DUAS mensagens independentes, nesta ordem, no MESMO chat**:

1. Enviar `/compactar`.
2. Após breve intervalo (~1 segundo), enviar o **prompt efetivo de retomada/continuação**, seja `continue` ou uma instrução completa e contextualizada, como exemplificado no anexo.

**NÃO é necessário aguardar a conclusão da compactação para enviar a segunda mensagem:** o comportamento esperado do ChatGPT é mantê-la em espera até o término de `/compactar`, processando-a posteriormente. **Verificar esse comportamento real**, sem presumir garantias não comprovadas.

**REQUISITOS:** preservar conteúdo integral, ordem, contexto, identidade da conversa e unicidade de cada envio; impedir duplicações, inversões, perda de mensagens, reenvios indevidos ou execução antecipada. NÃO substituir o prompt efetivo por `continue` quando houver instrução específica. NÃO bloquear desnecessariamente o Supervisor aguardando a compactação se o enfileiramento funcionar corretamente.

**VALIDAÇÃO BLOQUEANTE:** testar retomada e continuação, com prompts simples e completos, compactação demorada, enfileiramento, falhas e retentativas. Caso o comportamento esperado não seja suportado, identificar a limitação e corrigir com o menor ajuste compatível, sem inventar mecanismos nem degradar fluxos existentes.

**ACEITE:** `/compactar` → ~1 s → prompt efetivo, com processamento sequencial correto, continuidade preservada e nenhuma regressão. Implementar e comprovar; cumprimento parcial NÃO constitui conclusão.

Complementação humana posterior no mesmo chat: "quando eu envio o texto puro \"/compactar\" no prompt ele efetivamente processa compactando o contexto."
