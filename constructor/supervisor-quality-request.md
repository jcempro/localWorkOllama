# PROMPT BLOQUEANTE — AUDITORIA HISTÓRICA DO LOCALWORKER · AVALIAÇÃO COGNITIVA · EFICIÊNCIA E ADERÊNCIA

## 1. Auditoria integral

Inspecione e sintetize **TODOS os runs acessíveis do `localWorker` e as interações bidirecionais Supervisor ↔ Worker**, independentemente dos estados `completed`, `success`, `failed` ou equivalentes. Confronte solicitação original, instruções, comunicações, execução, respostas, validações, decisões do supervisor e desdobramentos posteriores.

**STATUS TÉCNICO ≠ QUALIDADE DA ENTREGA.** Sucesso/conclusão registrados NÃO comprovam atendimento efetivo; falha técnica NÃO comprova incompetência. Avalie cada retorno pelo resultado material e pelas evidências disponíveis, identificando:

- **Aderência:** requisitos atendidos, omissões, entregas parciais, inadequações, interpretações equivocadas, desvios e violações de contratos.
- **Capacidade cognitiva:** compreensão, raciocínio, discernimento técnico, autonomia, decisões, soluções propostas, identificação de problemas e antecipação de consequências.
- **Eficiência:** caminhos desnecessários, tentativas/repetições incorretas, retrabalho, reiterações, correções, processamento e consumo de recursos evitáveis.
- **Comunicação:** ambiguidades, falhas de transmissão/interpretação, divergências Supervisor ↔ Worker, instruções insuficientes, escalonamentos desnecessários ou ausentes.
- **Confiabilidade:** falsos sucessos, falsas falhas, falsos positivos/negativos, verificações inadequadas, conclusões prematuras e inconsistências entre status e resultado efetivo.
- **Tratamento de impedimentos:** pertinência das falhas, dificuldade real, alternativas avaliadas, tentativas realizadas e necessidade efetiva de intervenção do supervisor.

**Investigue especialmente runs declarados bem-sucedidos que posteriormente exigiram correções, novas demandas, reiterações ou refazimentos.** Identifique causas raízes e oportunidades comprovadas de melhoria, distinguindo responsabilidade do Worker, Supervisor, infraestrutura e limitações externas. NÃO atribua falhas cognitivas sem evidência nem presuma sucesso a partir do status.

## 2. Avaliação automática pelo Supervisor

Implemente, integrando à infraestrutura existente, **avaliação individual de CADA retorno do Worker pelo Supervisor**, inclusive retornos com falha.

A avaliação DEVE considerar conjuntamente:

1. **Aderência:** fidelidade integral à solicitação, requisitos e intenção comprovada.
2. **Inteligência técnica:** competência demonstrada como engenheiro de software ou especialista pertinente, compreensão, autonomia, julgamento e qualidade das decisões.
3. **Adequação:** correção, completude, utilidade e qualidade efetiva da entrega.
4. **Eficiência:** proporcionalidade entre complexidade, processamento, tentativas, recursos consumidos e resultado obtido.
5. **Gestão de falhas:** legitimidade dos impedimentos, qualidade das tentativas/alternativas e necessidade real de escalonamento, mesmo sem sucesso final.
6. **Retrabalho:** correções, reiterações, demandas adicionais e intervenções posteriores imputáveis a deficiências evitáveis.

**A nota DEVE refletir qualidade comprovada, NÃO o status operacional.** Uma falha justificada PODE receber avaliação elevada; um `completed/success` incompleto, inadequado ou ineficiente DEVE receber avaliação proporcionalmente inferior.

Utilize escala objetiva, consistente e explicitada, preferindo convenções já existentes. NÃO invente precisão estatística nem penalize complexidade ou impedimentos legítimos.

## 3. Persistência, interface e rastreabilidade

- **Somente o Supervisor** atribui/confirma a avaliação, após receber e examinar o retorno efetivamente concluído pelo Worker, **independentemente de sucesso ou falha**.
- A nota **NÃO DEVE ser persistida antecipadamente**, por status presumido, resposta incompleta ou avaliação ainda não concluída.
- Cada retorno avaliado DEVE possuir identificação inequívoca, nota, vínculo com demanda/run e justificativa quando aplicável, preservando rastreabilidade e compatibilidade com a persistência existente.
- **Dashboard:** exibir claramente a avaliação associada à demanda/retorno, sem poluição visual.
- **Histórico individual:** apresentar nota e justificativa **ultrassucinta**, explicando evidências determinantes de avaliações **altas ou baixas**. Para notas intermediárias, justificativa opcional, a critério do Supervisor.
- As avaliações DEVEM permanecer consultáveis e reutilizáveis em **auditorias futuras**, inclusive para identificar regressões, recorrências, confiabilidade e oportunidades de melhoria.

## 4. Economia de contexto e processamento

**A avaliação DEVE ser extremamente econômica**, aproveitando informações já disponíveis ao Supervisor, sem reanálises integrais desnecessárias, duplicação de histórico, relatórios prolixos ou novas chamadas custosas sem benefício demonstrado.

Registrar **nota + justificativa mínima quando exigida**, preservando evidência e significado. Priorizar análise incremental e proporcional ao retorno; aprofundar somente quando inconsistências, recorrências ou risco justificarem.

**NÃO transformar avaliação em nova demanda complexa, nem consumir recursos desproporcionais para medir eficiência.**

## 5. Implementação e aceite

Inspecione previamente arquitetura, contratos, registros, estados, UI e mecanismos reais de persistência. **Implemente a funcionalidade efetiva**, sem presumir componentes, caminhos, APIs ou tecnologias; reutilize infraestrutura existente e preserve retrocompatibilidade, determinismo, idempotência e ausência de regressões.

**VALIDAÇÃO BLOQUEANTE:**
- Auditoria histórica fundamentada, inclusive de sucessos inadequados e falhas justificadas.
- Avaliação individual de cada retorno elegível, com distinção entre status e qualidade.
- Nota atribuída pelo Supervisor **somente após recebimento e avaliação efetiva**.
- Justificativa obrigatória para notas altas/baixas; opcional para intermediárias.
- Visualização correta no dashboard e histórico; persistência e rastreabilidade verificadas.
- Baixo custo contextual/computacional, sem prejudicar a execução principal.
- Identificação de causas reais, retrabalho evitável e falsos resultados, sem penalizações arbitrárias.

**QUALQUER atendimento parcial NÃO constitui conclusão.** Corrija causas raízes, valide com evidências reais e apresente síntese objetiva dos achados, correções, testes e limitações de cobertura. **NÃO simule auditorias, avaliações ou verificações não realizadas.**