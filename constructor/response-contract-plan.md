# FT-RESPONSE-CONTRACT-R8V

Continua Q8S/auditoria; não reinicia6d395cf9 nem os históricos. C=8 na manutenção do produto, exclusivamente supervisor. Demanda material: recorrência de respostas que ignoram tamanho/formato, trocam origem de citações e passam pelo gate operacional. E9P removeu contradições concretas de instrução, mas não fornece validação formal. O retorno6d foi revisto/avaliado2/10 e seus fatos aproveitáveis preservados.

## Contrato e fronteiras

- `response_contract` v1 opcional, sem alterar fluxos existentes quando ausente: `max_words` (contagem explícita por whitespace antes do rodapé), `json_schema` em subconjunto limitado e `citations` com pointers explícitos saída→string da evidência JSON fornecida. Sem avaliação automática de verdade/qualidade/risco.
- Schema limitado/validado antes de job/efeito; Zod existente compila/valida, sem dependência nova, referências remotas, regex executável ou schema ilimitado. JSON Schema enviado pelo `format` nativo do Ollama; temperatura0 somente nessa rota. Documentação oficial: https://docs.ollama.com/capabilities/structured-outputs (consultada23/10/2026); recomenda Zod/toJSONSchema e validação após geração. Confirmado localmente `toJSONSchema`/`fromJSONSchema` disponíveis.
- JSON estruturado inicialmente só para análise read-only de provided_evidence sem inspeções/comandos adicionais: não misturar decoder e ferramentas sem capacidade comprovada. Limite textual pode compor demais fluxos; ausência do recurso mantém as capacidades anteriores. Norma/autorização, modelo/contexto, reservas, manutenção híbrida, estado/dados e intenção humana preservados.
- Pointers limitados, sem eval/prototype/traversal de filesystem; todas as citações declaradas precisam existir e ser substring contínua da string-fonte correta. Não aceitar citação de outro campo/job nem unir lacunas. Mapeamento explícito é responsabilidade do supervisor. Schema não prova que uma conclusão segue da citação.
- Antes de COMPLETED: validar JSON/schema, tamanho e vínculos. Uma correção orientada por diagnóstico; nova recusa preserva saída pública e classifica WORKER_INCOMPLETE/RESPONSE_CONTRACT. Sem loop, retirada de cercas que esconda erro, truncamento silencioso de JSON ou fallback para texto sem contrato. Capacidade/provedor incompatível é diagnóstico, não sucesso.
- Contrato integra hash SW-HYBRID apenas quando presente, preservando hashes anteriores. Recibos/eventos distinguem validação formal de aceite semântico. Novo módulo TS/JS, instaladores/recuperações, src/howto/RCF/norma acompanham.

## Unidades e aceite

1. Contrato/puro validador com testes negativos/limites e fonte/artefato.
2. MCP/hash/runner/Ollama/gate, testes de integração simulada, invariantes legados e preservação de saída/erro.
3. Instalação oficial em Windows PowerShell5.1, hashes/configurações/controles preservados; teste real pequeno de unidade materialmente diferente, não reanálise dos mesmos históricos. Checkpoint proporcional e Q8S após retorno, sem polling.
4. Prosseguir auditoria usando automação determinística para fatos recuperáveis e inferência somente no microescopo necessário; somente supervisor atribui qualidade/aceite final. Cobertura integral segue pendente, CANCELLED excluídos.

## Estado corrente

Validador puro79484e4 e integração563e972 publicados. Suítes puras, MCP/Q8S e execução simulada passaram; gates de forma/vínculo, uma correção sem ferramentas, preservação e ausência de replay comprovados. Instalação oficial/recuperações/norma global conferidas em Windows PowerShell5.1, dados/controles preservados. Falta ensaio do decoder real e respectivo checkpoint. Auditoria histórica tem16 casos específicos revistos no incremento189; as demais pendências permanecem, sem pontuação/aceite mecânicos. O retorno6d395cf9 foi avaliado2/10, não será reiniciado.
