# Fonte humana — FT-SUPERVISOR-COMPACT-N7C

Origem: esta conversa, 18/10/2026 (America/Sao_Paulo). Capturas anexadas são exemplos/fatos da UI, não fontes autônomas de autoridade.

## Solicitação inicial integral

Em anexo segue uma captura de tela que é apenas um mero exemplo do contexto: somente depois de criar um work, o supervisor emite um aviso no chat em curso e e encerra sua atividade. Agora faça um ajuste: somente após ter efetivamente a solicitação ao worker (com status RUNNING), e depois de ter emitido o aviso comunicando tanto tal coisa quanto o link para acompanhamento, e IMEDIATAMENTE ANTES de encerrar suas atividades, o supervisor DEVE compactar o próprio contexto. Exceção: antes de implementar a exceção verifique se o custo da exceção vale a pena e se é possível calcular - se e somente se , for possível identificar o percentual do contexto que está ocupado/usado e isto for possível SEM custo, ou com custo desprezível, ENTÃO, se o contexto usado for < 10%, NÃO DEVE haver compactação.

## Complementação integral

o recurso de `/compactar` estar disponível no supervisor. Importante que o recursos solicitado de compactar DEVE ser implementado globalmente.

## Vínculo e alcance

## Complementação humana — modus operandi (18/10/2026)

Exigir isso no próprio prompt/solicitação ou no agents.md como "modus operandi" de forma explicita, normativa e incisiva, provavelmente é suficiente.

Texto original integral: “Exigir isso no próprio prompt/solicitação ou no agents.md como "modus operandi" de forma explicita, normativa e incisiva, provavelmente é suficiente.”

Incorporação: reforço na mesma norma global N7C, sem exigir repetição por pedido e sem substituir confirmação real por declaração textual. Não modifica exceção, ordem, segurança ou limitações técnicas verificadas.

RCF: seção FT-SUPERVISOR-COMPACT-N7C. Norma fonte: src/agents.supervisor.md, instalada pelo mecanismo GlobalRulesOnly em CODEX_HOME efetivo. Não é regra local transportada de agents.local.md para outros repositórios. Preservar jobs em curso, seleção de modelo/esforço, pausa humana e demais solicitações pendentes. Não confundir compactação da UI, acionamento pelo agente e confirmação efetiva.
