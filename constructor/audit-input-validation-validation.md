# A3F — aceite do módulo de validação de entrada

Em 19/10/2026, resultado de 810a1d13-4252-4332-8139-cfaf8f6ed39f consultado uma vez: patch, syntax e verify com exit_code=0. Execução determinística sem inferência. Suíte: 87 entradas inválidas recusadas com erro fixo, entradas válidas/estados permitidos, zero/ausência, UUID duplicado inclusive CANCELLED/caixa e imutabilidade. Não houve repetição desses testes no supervisor.

Revisão proporcional confirmou fonte SHA256 db2ac6593d5f69c000b8622a039bb4fbd18efa7731e3ccc44d51b4b3ca587df5 igual à pós-condição, teste igual ao hash preparado, paths de estado e guarda positiva de events corretos, sem IO/rede/importações externas. Evidências privadas: facts-input-module-proof.json e facts-input-sequence-proof.json em audit-private/2026-10-15-review/.

Aceite exclusivo de audit-input-validation.mts e test-audit-input-validation.mts como unidade interna autônoma. Git do runtime não continha commits: os quatro arquivos estavam novos/não rastreados. O supervisor versiona apenas este módulo e seu teste neste aceite; helper/teste integral continuam pendentes. Não houve mudança no Worker instalado, no negócio ou em src/howto, pois este é recurso exclusivo do construtor. Não equivale a conclusão da auditoria nem a aceite do parser completo.
