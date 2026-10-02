# Regra local permanente — manutenção do localWorker

Esta regra aplica-se exclusivamente ao repositório que contém este arquivo, qualquer que seja seu caminho físico, em todas as conversas e execuções futuras associadas a ele. Antes de delegar qualquer tarefa daqui ao localWorker, leia esta regra.

- É proibido usar o próprio localWorker, direta ou indiretamente, para sua manutenção, correção, evolução, implementação, configuração ou integração. Isso inclui documentação de instalação e operação do próprio Worker quando sua redação ou correção constituir parte dessa manutenção.
- Todo trabalho para corrigir, modificar, implementar, configurar ou integrar o localWorker deve ser executado externamente a ele.
- O localWorker pode ser usado somente como instrumento de teste de uma solução já alterada definitivamente neste projeto ou em sua integração, na extensão necessária para validar essa alteração. O teste não pode pedir ao Worker que corrija, implemente ou modifique a si próprio.
- A preferência global por delegação ao Worker não derroga esta proibição específica deste repositório.

## Governança local de fonte, instalação e entrega

- A gestão de recursos é normativa para manutenção e testes: serviços vitais e fluidez do Windows têm precedência sobre o Worker; dentro da capacidade remanescente, o Worker deve receber preferência operacional sobre aplicações não essenciais, sem elevar prioridades a ponto de competir com o SO. Use CPU, GPU e respectivas memórias em conjunto quando vantajoso, preserve reservas mensuráveis de CPU, RAM e VRAM e nunca configure saturação intencional. Ausência de medição ou reserva suficiente exige espera limitada e diagnóstico, não consumo cego.
- Toda correção deve identificar e remover a causa-raiz de modo aplicável a casos análogos; é proibido declarar concluído um ajuste que trate somente o exemplo observado ou seu sintoma.

- Preserve integralmente os contratos e recursos existentes ao alterar o localWorker. Uma alteração só está concluída depois de validar o comportamento afetado e a equivalência da representação generalista em `src/`.
- Artefatos destinados à máquina destino têm representação em `src/`; valores privados e exclusivos deste ambiente de desenvolvimento ficam fora de `src/` e de `howto.md`. Prefira parâmetros, variáveis de ambiente e descoberta dinâmica. Centralize valores configuráveis por arquivo, com nomes inequívocos e, quando útil, sufixo alfanumérico curto.
- Após alterar implementação ou instruções instaláveis, execute `node scripts/sync-src.mjs --write`. O hook versionado de pré-commit valida e atualiza espelhos e documentação; configure-o com `git config core.hooksPath .githooks`. Não contorne a validação para declarar uma unidade concluída.
- Cada unidade mínima coerente concluída exige commit próprio e tentativa imediata de push ao remote configurado. Não misture trabalho alheio, parcial ou não validado no commit. Ausência ou falha do remote deve ser registrada explicitamente; não invente destino nem use outro repositório.
