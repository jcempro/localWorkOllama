# SW-HYBRID — evidência da migração

Escopo: somente política de manutenção própria; outras capacidades/contratos preservados. Execução da migração exclusivamente pelo supervisor (C=8), sem Worker na manutenção. Fonte/interpretações humanas e fases em `hybrid-plan.md`; checkpoint contextual privado, não distribuído.

## Validações concluídas

- `node constructor/test-hybrid-policy.mts`: limites exatos 0/5/7/10, C>7/exclusivo, ausência/invalidade/incerteza, vínculo de tarefa/mode/paths/comandos/commit/avaliação, júnior/estagiário e replay pré-efeito. Dados são fixtures, não avaliação automatizada de risco.
- `TEST_REPO_PATH=<alvo autorizado> node constructor/test-hybrid-runtime.mts`: runtime real com Ollama simulado, mesmo modelo nas duas patentes; júnior realiza dois efeitos; estagiário preserva o primeiro e impede segundo antes de editar; mudança de escopo bloqueada antes de inferência; path não aprovado sem arquivo criado; Git exato preservado. Arquivos temporários únicos limpos após reconhecer conteúdo.
- `TEST_REPO_PATH=<alvo autorizado> node constructor/test-hybrid-mcp.mts`: schema MCP real/defaults/hash; C≤5 júnior e C=7 júnior/estagiário passam a avaliação até a guarda posterior de chat arquivado; C>7/exclusivo/incerteza/escopo alterado/avaliação ausente rejeitados; nenhum job criado.
- `node localworker/test-integration.mjs` com alvo autorizado e permissão necessária: COMPLETED/QUEUED_TO_CHAT simulado, falha HTTP corretamente classificada, três envios na fixture previstos pelo teste, duas inferências simuladas, Git preservado e veto sem adoção. A primeira execução restrita falhou em `local_monitor` ANTES de qualquer `local_analyze`; recibo público exit1/linha110 e ausência de job reconciliados antes da tentativa em ambiente autorizado. A revisão recusou repetição incerta; nenhuma recusa foi contornada.
- Sintaxe PowerShell do instalador/atualizador e `node scripts/sync-src.mjs --write`: 38 artefatos, fonte TypeScript/JavaScript equivalentes e sem valores privados do desenvolvimento.
- `constructor/test-hybrid-install.ps1` em Windows PowerShell 5.1: instalação nova isolada, adoção/identidade, arquivos equivalentes e atualização sem repetir opt-in preservando política, modelo, contexto e timeout; fixture exclusiva removida. Nenhum watchdog/modelo/job adicional.

## Ativação real e aceite

O instalador real terminou após o evento do job anterior, com `INSTALLED`, registro MCP OK e watchdog existente preservado. `maintenance_hybrid_version=1`; seis arquivos críticos instalados conferem byte a byte com `src/`; modelo `qwen3-coder-next-32k`, contexto32768 e timeout0 preservados. Norma global ativa atualizada com backup, inclusive a frase antiga de veto absoluto na ponte, agora condicionada a SW-HYBRID.

Uma chamada pela ponte REAL instalada com C=8 retornou `WORKER_REQUEST_REJECTED: Supervisor exclusivo: delegação proibida`, antes da criação de job/inferência. O CLI corretamente encerra com exit1/stderr; a primeira expectativa do harness de receber JSON em stdout estava errada, não a guarda. O recibo foi aproveitado, SEM repetir a chamada. Prova privada em `audit-private/hybrid-installed-proof.json`. Não houve manutenção executada pelo Worker nesta migração.

O apoio temporário de espera foi descartado sem lançamento/envio porque a instalação concluiu durante a conferência final; não integra runtime ou capacidade distribuída. Não houve novo `continue` nem tarefa adicional. Fonte, norma, implementação, instalação e 38 espelhos estão coerentes quanto ao regime híbrido.

## Limites

Testes do comportamento de patentes usam Ollama simulado para forçar estratégias determinísticas/adversas; não provam obediência semântica universal do modelo real. Runtime valida a decisão declarada e o vínculo, não decide nem certifica C. Hash não autentica caller, cria sandbox/firewall ou garante inviolabilidade contra administrador/hardware. Execução de comando aprovado depende da inspeção de fonte/argv/efeitos pelo supervisor. Processo MCP antigo já carregado pode conservar catálogo/módulos antigos: a ponte atualizada foi validada para a guarda, sem prometer reload automático do catálogo.

Nenhum resultado desses testes conclui FTs de negócio de outro projeto. Job TTS anterior não foi reiniciado nem seu trabalho reproduzido. SR-001, modelo/esforço, monitor/STOP/exclusão/recursos/contexto/retomada/Git existentes não foram substituídos. Checkpoint estagiário usa o fluxo terminal existente com `error_kind=NEEDS_SUPERVISOR`, jamais WORKER_INFRA_ERROR nem sucesso inferido.
