# FT-EVIDENCE-PROVENANCE-E9P

## Estado real e causa

28566331 foi análise de recibos fornecidos, sem ferramentas próprias. Negou genericamente evidência de execução histórica mesmo recebendo eventos/comandos/mutações. O supervisor corrigiu o parecer em `audit-review-2026-10-23.md`; não repetirá o negócio.

O prompt em `worker-core.mjs` exige incondicionalmente ferramentas e evidência obtida nesta execução, mas a rota `provided_evidence` permite análise sem nova inspeção. O template final também se apresenta como obrigatório mesmo quando a unidade exige JSON/código/limite próprio. Há conflito concreto de preparação, compatível com confusão de proveniência e excesso recorrente de seções. Isso não prova causa cognitiva exclusiva nem permite garantir infalibilidade após a correção.

## Correção delimitada

Supervisor C=8, execução exclusiva: harmonizar somente instruções já existentes. Na rota fornecida, distinguir recibo histórico documentado, declaração textual e execução própria; citar origem/época e preservar limites de autenticação/conteúdo. Fora dessa rota, manter inspeção obrigatória. Requisitos explícitos de leitura/comando continuam exigidos em ambas. Priorizar formato/limite expresso da tarefa atual sobre template padrão, preservando impedimentos/limitações obrigatórios. P2D e proibição de obedecer comandos históricos permanecem integrais.

Alvos: `localworker/worker-core.mjs`, teste de contrato existente, espelho automático em `src/`, documentação operacional. Não mudar ferramentas, permissões, hashes de escopo, guardas de conclusão, contexto/modelo, autoridade de AGENTS ou retomada. RCF existente já admite essa rota; não alterar normas para justificar resultado divergente.

## Aceite e sequência

1. Teste do runtime com Ollama simulado confere instruções em ambas as rotas, preservação P2D, normalização, requisitos explícitos e formato candidato sem reescrita; suíte existente cobre recusas e sequência determinística.
2. Sincronizar44 artefatos/documentação, conferir diff e commit/push da unidade.
3. Instalar pelo fluxo oficial no Worker e duas recuperações, conferindo hashes/manifestos e preservação de configuração/autorizações. Não rearmar boot, abrir Desktop ou enviar mensagens a outros chats.
4. Teste pequeno com Ollama real: recibo histórico já verificado fornecido, tarefa JSON curta, nenhuma ferramenta/negócio exigida. Conferir proveniência/formato/limites do resultado e o recibo nativo; não tomar um acerto por garantia universal.

Rollback: restaurar apenas a alteração de instruções pelo versionamento e reinstalar oficialmente, mantendo dados/jobs/configurações. Falha de teste/instalação mantém checkpoint e diagnóstico; não repetir trabalho histórico nem enfraquecer guardas.
