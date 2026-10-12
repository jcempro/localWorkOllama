# Auditoria individual dos jobs

[Diagnóstico, causas e correções](audit-causes.md) · [Manifesto de evidências](audit-manifest.json)

Captura: 2026-10-12T01:26:14.921Z. **197 jobs examinados**, 1 cancelado(s) excluído(s). Estados originais: 113 FAILED, 84 COMPLETED. 88 operacionais e 109 fixtures. Não confundir estes estados com o aceite da entrega.

## Jobs operacionais

### 041b84bc-8499-4085-8cf7-64bed3c3fc19

- **Estado persistido:** FAILED; entrega: QUEUED_TO_CHAT.
- **Unidade delegada:** Renomear fixture e executar teste autorizado.
- **Execução, retorno e avaliação:** Comando ignorado; sete leituras e três compactações, sem entrega. Recuperação posterior pelo supervisor.
- **Causa/impacto:** Instrução de execução tratada como análise; evidência recente perdida na compactação.
- **Correções generalizadas:** C1,C2 (tabela do relatório de causas).
- **Evidência:** 38 eventos; 3 checkpoints; read_file=7. Manifesto 85c880dacf1d.

### 05d99ac1-267b-496a-95b9-5f9875c78b28

- **Estado persistido:** COMPLETED; entrega: QUEUED_TO_CHAT.
- **Unidade delegada:** Worker subordinado.
- **Execução, retorno e avaliação:** COMPLETED; 21 ferramentas aprovadas, 5 recusas/erros; 0 comandos em sequencia. Clonagem JSON: testes falharam, houve edicoes e validacoes finais aprovadas; nova revisao exigiu ajustes no job 07a35229.
- **Causa/impacto:** Clonagem JSON: testes falharam, houve edicoes e validacoes finais aprovadas; nova revisao exigiu ajustes no job 07a35229.
- **Correções generalizadas:** C6,C12 (tabela do relatório de causas).
- **Evidência:** 200 eventos; 14 checkpoints; read_file=9, run_authorized_command=12, edit_file=5. Manifesto 79de18cd5792.

### 0636b4d3-dcf0-4f4f-89f3-68cb0f7bd169

- **Estado persistido:** FAILED; entrega: AMBIGUOUS.
- **Unidade delegada:** Worker subordinado.
- **Execução, retorno e avaliação:** FAILED; 0 ferramentas aprovadas, 0 recusas/erros; 2 comandos em sequencia. Runner desapareceu durante prepare; Kernel-Power41/6008 registram reinicio inesperado. Logs, delivery e indice ativo zerados. Efeitos do comando nao sao comprovaveis; proibido replay cego.
- **Causa/impacto:** Runner desapareceu durante prepare; Kernel-Power41/6008 registram reinicio inesperado. Logs, delivery e indice ativo zerados. Efeitos do comando nao sao comprovaveis; proibido replay cego.
- **Correções generalizadas:** C11 (tabela do relatório de causas).
- **Evidência:** 1 eventos; 0 checkpoints; sem eventos de ferramenta retidos. Manifesto 240ccc5a1943.

### 06b4db91-c629-4971-af57-53ad1a0a333e

- **Estado persistido:** FAILED; entrega: QUEUED_TO_CHAT.
- **Unidade delegada:** Aplicar pages-guard e validar.
- **Execução, retorno e avaliação:** Patch aplicado; teste falhou com UnboundLocalError; unidade parcial preservada.
- **Causa/impacto:** Script preparado pelo supervisor usou variável fake_pdf_engine que sombreava função; retry de patch não idempotente.
- **Correções generalizadas:** C2,C3,C9 (tabela do relatório de causas).
- **Evidência:** 115 eventos; 7 checkpoints; read_file=8, run_authorized_command=3, search_text=12, list_dir=1. Manifesto 268e966abab1.

### 07a35229-efab-416b-bf23-8c2645b81718

- **Estado persistido:** COMPLETED; entrega: QUEUED_TO_CHAT.
- **Unidade delegada:** Worker subordinado.
- **Execução, retorno e avaliação:** COMPLETED; 7 ferramentas aprovadas, 2 recusas/erros; 0 comandos em sequencia. Duas substituicoes inicialmente recusadas por trecho nao unico/ausente; leituras e edicoes corrigidas, typecheck/clone_behavior aprovados.
- **Causa/impacto:** Duas substituicoes inicialmente recusadas por trecho nao unico/ausente; leituras e edicoes corrigidas, typecheck/clone_behavior aprovados.
- **Correções generalizadas:** C5,C12 (tabela do relatório de causas).
- **Evidência:** 67 eventos; 4 checkpoints; read_file=3, edit_file=4, run_authorized_command=2. Manifesto ded0319838e1.

### 0a5a6a2e-6fc2-4ea2-8f63-b4aa86b3408a

- **Estado persistido:** COMPLETED; entrega: QUEUED_TO_CHAT.
- **Unidade delegada:** Worker subordinado.
- **Execução, retorno e avaliação:** COMPLETED; 3 ferramentas aprovadas, 0 recusas/erros; 3 comandos em sequencia. Suite permanente do adaptador criada por sequencia deterministica e validada.
- **Causa/impacto:** Suite permanente do adaptador criada por sequencia deterministica e validada.
- **Correções generalizadas:** C2,C6 (tabela do relatório de causas).
- **Evidência:** 11 eventos; 0 checkpoints; run_authorized_command=3. Manifesto 1bdc9454cbd5.

### 10ed293e-6362-43ad-9ea7-ad134e176cff

- **Estado persistido:** COMPLETED; entrega: QUEUED_TO_CHAT.
- **Unidade delegada:** Worker subordinado.
- **Execução, retorno e avaliação:** COMPLETED; 2 ferramentas aprovadas, 0 recusas/erros; 0 comandos em sequencia. Duas leituras nao impediram exportacoes inventadas e proposta de mudar core; supervisor rejeitou desenho e delegou 167f9061 com evidencia delimitada. Houve duas consultas local_result.
- **Causa/impacto:** Duas leituras nao impediram exportacoes inventadas e proposta de mudar core; supervisor rejeitou desenho e delegou 167f9061 com evidencia delimitada. Houve duas consultas local_result.
- **Correções generalizadas:** C6,C9 (tabela do relatório de causas).
- **Evidência:** 21 eventos; 1 checkpoints; read_file=2. Manifesto bc710f16369a.

### 167f9061-2b96-4a45-81a3-e2262572880d

- **Estado persistido:** COMPLETED; entrega: QUEUED_TO_CHAT.
- **Unidade delegada:** Worker subordinado.
- **Execução, retorno e avaliação:** COMPLETED; 0 ferramentas aprovadas, 0 recusas/erros; 0 comandos em sequencia. Desenho corretivo baseado em evidencia fornecida; nenhuma ferramenta foi executada. Nao comprova implementacao propria.
- **Causa/impacto:** Desenho corretivo baseado em evidencia fornecida; nenhuma ferramenta foi executada. Nao comprova implementacao propria.
- **Correções generalizadas:** C6 (tabela do relatório de causas).
- **Evidência:** 6 eventos; 0 checkpoints; sem eventos de ferramenta retidos. Manifesto 598c80e63203.

### 177a3ead-0b73-4d7b-a38b-f9e21557fcc7

- **Estado persistido:** FAILED; entrega: QUEUED_TO_CHAT.
- **Unidade delegada:** Análise delimitada de PDF.
- **Execução, retorno e avaliação:** Sete leituras de dois arquivos, três compactações; sem resposta útil.
- **Causa/impacto:** Compactação retirou código recém-lido antes de o modelo poder examiná-lo; releituras sem progresso.
- **Correções generalizadas:** C1,C5 (tabela do relatório de causas).
- **Evidência:** 38 eventos; 3 checkpoints; read_file=7. Manifesto 98c5b6bf548a.

### 18958922-a382-4b46-8d43-30265a4469de

- **Estado persistido:** COMPLETED; entrega: QUEUED_TO_CHAT.
- **Unidade delegada:** Worker subordinado.
- **Execução, retorno e avaliação:** COMPLETED; 1 ferramentas aprovadas, 0 recusas/erros; 1 comandos em sequencia. Documentacao preparada aplicada e verificada, recuperando a omissao de 4aa40afc.
- **Causa/impacto:** Documentacao preparada aplicada e verificada, recuperando a omissao de 4aa40afc.
- **Correções generalizadas:** C2 (tabela do relatório de causas).
- **Evidência:** 5 eventos; 0 checkpoints; run_authorized_command=1. Manifesto 81f304d528f1.

### 1909cbd7-c886-452b-ab29-146c0936eae7

- **Estado persistido:** COMPLETED; entrega: QUEUED_TO_CHAT.
- **Unidade delegada:** Executar epub-boundaries e relatar.
- **Execução, retorno e avaliação:** Comando passou; relatório acrescentou limite inexistente de 512 MiB e chamou entradas de bytes. Execução aceita, texto não integralmente idôneo.
- **Causa/impacto:** Inferência extrapolou saída; aceite de código zero não valida afirmações adicionais.
- **Correções generalizadas:** C2,C6 (tabela do relatório de causas).
- **Evidência:** 11 eventos; 0 checkpoints; run_authorized_command=1. Manifesto 53e2016e6409.

### 1b270666-9d49-4b10-86d2-840f3b87530e

- **Estado persistido:** FAILED; entrega: QUEUED_TO_CHAT.
- **Unidade delegada:** Worker subordinado.
- **Execução, retorno e avaliação:** FAILED; 7 ferramentas aprovadas, 0 recusas/erros; 0 comandos em sequencia. Continuidade de 31315b9d voltou a repetir leituras sem escrever; recuperada por sequencia deterministica 3800f0d6.
- **Causa/impacto:** Continuidade de 31315b9d voltou a repetir leituras sem escrever; recuperada por sequencia deterministica 3800f0d6.
- **Correções generalizadas:** C1,C12 (tabela do relatório de causas).
- **Evidência:** 53 eventos; 4 checkpoints; read_file=7. Manifesto 220e8bd61278.

### 1b6422cf-7246-402a-831b-a04d74921f52

- **Estado persistido:** FAILED; entrega: QUEUED_TO_CHAT.
- **Unidade delegada:** Implementar limites EPUB.
- **Execução, retorno e avaliação:** Sete leituras, duas compactações, nenhuma implementação comprovada.
- **Causa/impacto:** Execução solicitada convertida em exploração; evidência perdida e ausência de obrigação de executar ID específico.
- **Correções generalizadas:** C1,C2 (tabela do relatório de causas).
- **Evidência:** 32 eventos; 2 checkpoints; read_file=7. Manifesto 55db53351875.

### 21365a86-97f3-4745-8c62-85cf650677df

- **Estado persistido:** COMPLETED; entrega: QUEUED_TO_CHAT.
- **Unidade delegada:** Worker subordinado.
- **Execução, retorno e avaliação:** COMPLETED; 2 ferramentas aprovadas, 0 recusas/erros; 2 comandos em sequencia. Build corrigido de ESM para CommonJS respeitando package.json aplicavel; validacao passou.
- **Causa/impacto:** Build corrigido de ESM para CommonJS respeitando package.json aplicavel; validacao passou.
- **Correções generalizadas:** C2,C9 (tabela do relatório de causas).
- **Evidência:** 8 eventos; 0 checkpoints; run_authorized_command=2. Manifesto 2300d91df9ba.

### 23dae47e-bc49-4c4b-9716-c247f96bfd7c

- **Estado persistido:** COMPLETED; entrega: QUEUED_TO_CHAT.
- **Unidade delegada:** Analisar limites EPUB e propor unidade.
- **Execução, retorno e avaliação:** COMPLETED com MAX_FILES=50, MAX_SIZE_MB=200 e MAX_UNCOMPRESSED_MB=500 não sustentados pelos arquivos; supervisor rejeitou.
- **Causa/impacto:** Alucinação de valores/APIs após compactações; inspeção genérica permitia conclusão sem lastro semântico.
- **Correções generalizadas:** C1,C6 (tabela do relatório de causas).
- **Evidência:** 73 eventos; 6 checkpoints; read_file=9, list_dir=1. Manifesto 0cd776ef2f7b.

### 2464bdd0-1d79-4bc1-89bb-9610f9ac6dcd

- **Estado persistido:** FAILED; entrega: QUEUED_TO_CHAT.
- **Unidade delegada:** Patch e teste, sem commit pelo Worker.
- **Execução, retorno e avaliação:** Patch/teste bem-sucedidos; guarda de commit impediu conclusão. Supervisor registrou 8418d53a51.
- **Causa/impacto:** Runtime exigia commit apesar da instrução contrária e de alterações herdadas; propriedade deve permanecer protegida.
- **Correções generalizadas:** C4 (tabela do relatório de causas).
- **Evidência:** 34 eventos; 1 checkpoints; read_file=2, list_dir=1, run_authorized_command=1, git_commit_unit=1. Manifesto f0017b41c439.

### 2534f348-4461-46be-8531-4260576b006a

- **Estado persistido:** COMPLETED; entrega: QUEUED_TO_CHAT.
- **Unidade delegada:** FT-104, correção do job e6cd3e35-ee34-4da5-af48-3ed7b53f5805: nenhuma escrita, apenas releituras.
- **Execução, retorno e avaliação:** COMPLETED; 3 ferramentas aprovadas, 0 recusas/erros; 3 comandos em sequencia. Quatro testes de clonagem adicionados e validados; callback recebeu falha de cota no supervisor.
- **Causa/impacto:** Quatro testes de clonagem adicionados e validados; callback recebeu falha de cota no supervisor.
- **Correções generalizadas:** C2,C10 (tabela do relatório de causas).
- **Evidência:** 11 eventos; 0 checkpoints; run_authorized_command=3. Manifesto a5c537de91b3.

### 26c72128-8052-4f82-a366-4757468f437d

- **Estado persistido:** COMPLETED; entrega: QUEUED_TO_CHAT.
- **Unidade delegada:** Checkpoint de prontidão FT-101.
- **Execução, retorno e avaliação:** COMPLETED após apenas git_status; próprio texto admite não ler arquivos. Não entregou análise solicitada.
- **Causa/impacto:** Inspeção genérica contava metadados Git como evidência de conteúdo.
- **Correções generalizadas:** C6 (tabela do relatório de causas).
- **Evidência:** 15 eventos; 0 checkpoints; git_status=1. Manifesto 8be5f8f95db7.

### 26cba7d7-e0dd-4e4e-8742-1bf631a6da41

- **Estado persistido:** COMPLETED; entrega: QUEUED_TO_CHAT.
- **Unidade delegada:** Worker subordinado.
- **Execução, retorno e avaliação:** COMPLETED; 3 ferramentas aprovadas, 0 recusas/erros; 3 comandos em sequencia. Guia e checkpoint/projecao atualizados por sequencia oficial; FT continua pendente de gates.
- **Causa/impacto:** Guia e checkpoint/projecao atualizados por sequencia oficial; FT continua pendente de gates.
- **Correções generalizadas:** C2,C6 (tabela do relatório de causas).
- **Evidência:** 11 eventos; 0 checkpoints; run_authorized_command=3. Manifesto c58dacae9f7e.

### 31315b9d-0fac-4837-83ac-49a2fad55bf1

- **Estado persistido:** FAILED; entrega: QUEUED_TO_CHAT.
- **Unidade delegada:** Worker subordinado.
- **Execução, retorno e avaliação:** FAILED; 13 ferramentas aprovadas, 0 recusas/erros; 0 comandos em sequencia. Criacao de suite virou 12 leituras e uma listagem, sem escrita; contrato interrompeu estagnacao.
- **Causa/impacto:** Criacao de suite virou 12 leituras e uma listagem, sem escrita; contrato interrompeu estagnacao.
- **Correções generalizadas:** C1,C12 (tabela do relatório de causas).
- **Evidência:** 91 eventos; 8 checkpoints; read_file=12, list_dir=1. Manifesto d66e6d25e1ca.

### 335dbab3-f591-4630-88dd-7b6288b1a48c

- **Estado persistido:** FAILED; entrega: QUEUED_TO_CHAT.
- **Unidade delegada:** Patch de deduplicação e teste, sem commit.
- **Execução, retorno e avaliação:** Patch/teste passaram; tentativas de commit com path/argumentos inválidos bloquearam conclusão. Supervisor registrou e102c4f2f0.
- **Causa/impacto:** Conflito entre instrução de não commitar e política inflexível de runtime; erro determinístico repetido.
- **Correções generalizadas:** C4,C5 (tabela do relatório de causas).
- **Evidência:** 102 eventos; 6 checkpoints; read_file=6, list_dir=4, run_authorized_command=1, git_commit_unit=2. Manifesto 6413e32887ca.

### 34f68910-7e3a-44e3-a3ec-88d0524d5d1f

- **Estado persistido:** FAILED; entrega: QUEUED_TO_CHAT.
- **Unidade delegada:** Levantamento inicial para sequência editorial.
- **Execução, retorno e avaliação:** 34 leituras e exploração de rotas não pertinentes; unidade sem resultado.
- **Causa/impacto:** Macrodelegação ampla e expansão de contexto além do necessário; supervisor depois segmentou em 85c8d3a8.
- **Correções generalizadas:** C1,C9 (tabela do relatório de causas).
- **Evidência:** 80 eventos; 1 checkpoints; read_file=34. Manifesto cf761e39ca00.

### 3800f0d6-44e3-4bed-adac-3b4b83d6d206

- **Estado persistido:** COMPLETED; entrega: QUEUED_TO_CHAT.
- **Unidade delegada:** FT-104: unidade corretiva do job 1b270666-9d49-4b10-86d2-840f3b87530e, que repetiu leituras sem mudanças.
- **Execução, retorno e avaliação:** COMPLETED; 3 ferramentas aprovadas, 0 recusas/erros; 3 comandos em sequencia. Tres testes terminais implementados pela sequencia corretiva de 1b270666.
- **Causa/impacto:** Tres testes terminais implementados pela sequencia corretiva de 1b270666.
- **Correções generalizadas:** C2 (tabela do relatório de causas).
- **Evidência:** 11 eventos; 0 checkpoints; run_authorized_command=3. Manifesto 3e3e0cd0b0d2.

### 39a6be1a-3e89-4cad-b3ae-c507bfbcabb9

- **Estado persistido:** COMPLETED; entrega: QUEUED_TO_CHAT.
- **Unidade delegada:** Atualizar documentação pages e commitar.
- **Execução, retorno e avaliação:** Alteração/commit 0b5e072a4f8e396f4f0a07fb8f2588a25d779347 confirmados na retomada; entrega delimitada aceita.
- **Causa/impacto:** Ausência de índice refused foi diagnosticada; não impediu a entrega. Sem defeito adicional comprovado.
- **Correções generalizadas:** C6,C9 (tabela do relatório de causas).
- **Evidência:** 52 eventos; 2 checkpoints; read_file=8, run_authorized_command=1, git_commit_unit=1. Manifesto b3743cb1c7b9.

### 3a1648f0-39c0-4fbf-8d50-21d4ae6169ea

- **Estado persistido:** COMPLETED; entrega: QUEUED_TO_CHAT.
- **Unidade delegada:** Unidade corretiva FT-104 do job 9eeded63-3d66-424f-973e-843fe338e167.
- **Execução, retorno e avaliação:** COMPLETED; 3 ferramentas aprovadas, 0 recusas/erros; 3 comandos em sequencia. Correcao preservou teste parcial de 9eeded63, ajustando clone/isolation sem reaplicar a unidade inteira.
- **Causa/impacto:** Correcao preservou teste parcial de 9eeded63, ajustando clone/isolation sem reaplicar a unidade inteira.
- **Correções generalizadas:** C2,C3 (tabela do relatório de causas).
- **Evidência:** 11 eventos; 0 checkpoints; run_authorized_command=3. Manifesto 3dfb7ae1eb52.

### 3cef7c29-1090-4830-856d-5e30f4d7a06d

- **Estado persistido:** FAILED; entrega: QUEUED_TO_CHAT.
- **Unidade delegada:** Correção de fixture por comando autorizado multiline.
- **Execução, retorno e avaliação:** Rejeição antes da inferência; sem efeitos. Unidade posterior 6744af56 entregou.
- **Causa/impacto:** Schema MCP aceitava argv multiline, mas runner o proibia; contrato divergente entre camadas.
- **Correções generalizadas:** C2 (tabela do relatório de causas).
- **Evidência:** 0 eventos; 0 checkpoints; sem eventos de ferramenta retidos. Manifesto c85f305494bc.

### 3fc8d540-0fe7-49d0-949b-ea4f10f3e9b4

- **Estado persistido:** COMPLETED; entrega: QUEUED_TO_CHAT.
- **Unidade delegada:** FT-104 continuação determinística do job c23fd8a5, que só repetiu leituras.
- **Execução, retorno e avaliação:** COMPLETED; 3 ferramentas aprovadas, 0 recusas/erros; 3 comandos em sequencia. Patch deterministico do executor recuperou c23fd8a5; typecheck e comportamento aprovados.
- **Causa/impacto:** Patch deterministico do executor recuperou c23fd8a5; typecheck e comportamento aprovados.
- **Correções generalizadas:** C2 (tabela do relatório de causas).
- **Evidência:** 11 eventos; 0 checkpoints; run_authorized_command=3. Manifesto 0787798d91b1.

### 42d71676-c626-40aa-8002-93ebebc4ec87

- **Estado persistido:** FAILED; entrega: QUEUED_TO_CHAT.
- **Unidade delegada:** Criar guia com base no contexto indicado.
- **Execução, retorno e avaliação:** Quatro leituras falharam por ENOENT; guia não criado.
- **Causa/impacto:** Confusão entre .ia/rules e .ia.rules; não utilizar alternativa válida.
- **Correções generalizadas:** C5,C9 (tabela do relatório de causas).
- **Evidência:** 14 eventos; 0 checkpoints; read_file=4. Manifesto df0ec9dcd9da.

### 466f6512-c301-45ee-b75a-dee78657df4c

- **Estado persistido:** FAILED; entrega: QUEUED_TO_CHAT.
- **Unidade delegada:** Aplicar pdf-size-guard e testar.
- **Execução, retorno e avaliação:** Primeira aplicação passou; repetição do patch falhou. Supervisor preservou resultado e registrou d4446cc419.
- **Causa/impacto:** Sem recibo de sucesso obrigatório/rejeição de repetição; script mutante foi reaplicado a estado já alterado.
- **Correções generalizadas:** C2,C3 (tabela do relatório de causas).
- **Evidência:** 64 eventos; 3 checkpoints; read_file=7, list_dir=2, run_authorized_command=3, git_status=1. Manifesto 60bc57ccc212.

### 46f217a3-9ffd-4bb3-876b-f7c6e48f1d4d

- **Estado persistido:** FAILED; entrega: QUEUED_TO_CHAT.
- **Unidade delegada:** Você é worker subordinado.
- **Execução, retorno e avaliação:** FAILED; 12 ferramentas aprovadas, 1 recusas/erros; 0 comandos em sequencia. Cobertura PDF nao concluida, 12 leituras e uma tentativa de edit; b5f0a09a recuperou trecho/estrategia delimitados.
- **Causa/impacto:** Cobertura PDF nao concluida, 12 leituras e uma tentativa de edit; b5f0a09a recuperou trecho/estrategia delimitados.
- **Correções generalizadas:** C1,C5,C12 (tabela do relatório de causas).
- **Evidência:** 86 eventos; 8 checkpoints; read_file=12, edit_file=1. Manifesto 0d26e4662f43.

### 47087e3b-d3f1-4da4-8333-7541b9702d0e

- **Estado persistido:** COMPLETED; entrega: QUEUED_TO_CHAT.
- **Unidade delegada:** Worker subordinado.
- **Execução, retorno e avaliação:** COMPLETED; 4 ferramentas aprovadas, 0 recusas/erros; 0 comandos em sequencia. Clonagem JSON escrita e testes iniciais passaram; revisao posterior encontrou getters/limites/arrays incorretos. Passar teste parcial nao prova contrato completo.
- **Causa/impacto:** Clonagem JSON escrita e testes iniciais passaram; revisao posterior encontrou getters/limites/arrays incorretos. Passar teste parcial nao prova contrato completo.
- **Correções generalizadas:** C6,C9 (tabela do relatório de causas).
- **Evidência:** 34 eventos; 2 checkpoints; read_file=1, run_authorized_command=2, edit_file=1. Manifesto 9e2b711a8b1c.

### 48309641-c02b-4ba1-8a83-ac0138d67679

- **Estado persistido:** FAILED; entrega: QUEUED_TO_CHAT.
- **Unidade delegada:** Implementação delimitada autorizada.
- **Execução, retorno e avaliação:** Nenhuma alteração; leituras repetidas e tentativa Python via run_command em vez do ID autorizado.
- **Causa/impacto:** Semântica de ferramentas não compartilhada; comando permitido não era execução obrigatória.
- **Correções generalizadas:** C2,C5,C9 (tabela do relatório de causas).
- **Evidência:** 40 eventos; 3 checkpoints; read_file=4, run_command=1. Manifesto 9777a7b7186a.

### 492b9846-2e20-43e5-9d59-5339f27adc79

- **Estado persistido:** COMPLETED; entrega: QUEUED_TO_CHAT.
- **Unidade delegada:** Worker subordinado.
- **Execução, retorno e avaliação:** COMPLETED; 3 ferramentas aprovadas, 0 recusas/erros; 3 comandos em sequencia. Criou adaptador antes da verificacao, recuperando fonte ausente em f02aebfe.
- **Causa/impacto:** Criou adaptador antes da verificacao, recuperando fonte ausente em f02aebfe.
- **Correções generalizadas:** C2 (tabela do relatório de causas).
- **Evidência:** 11 eventos; 0 checkpoints; run_authorized_command=3. Manifesto b64b913f3211.

### 4aa40afc-5647-4ea2-b88c-b6dab3d8c250

- **Estado persistido:** FAILED; entrega: QUEUED_TO_CHAT.
- **Unidade delegada:** Worker subordinado.
- **Execução, retorno e avaliação:** FAILED; 0 ferramentas aprovadas, 0 recusas/erros; 0 comandos em sequencia. Resposta sem ferramenta nem inspecao, documentacao nao entregue; recuperada em 18958922.
- **Causa/impacto:** Resposta sem ferramenta nem inspecao, documentacao nao entregue; recuperada em 18958922.
- **Correções generalizadas:** C2,C6 (tabela do relatório de causas).
- **Evidência:** 9 eventos; 0 checkpoints; sem eventos de ferramenta retidos. Manifesto 791de441ee5a.

### 54cf4c6f-79c3-4305-bf90-d57fffa86d0a

- **Estado persistido:** FAILED; entrega: QUEUED_TO_CHAT.
- **Unidade delegada:** Worker subordinado.
- **Execução, retorno e avaliação:** FAILED; 2 ferramentas aprovadas, 6 recusas/erros; 0 comandos em sequencia. Validacao preparada falhou reiteradamente por contrato de CLI; supervisor corrigiu precondicao e argumentos na unidade seguinte.
- **Causa/impacto:** Validacao preparada falhou reiteradamente por contrato de CLI; supervisor corrigiu precondicao e argumentos na unidade seguinte.
- **Correções generalizadas:** C5,C9,C12 (tabela do relatório de causas).
- **Evidência:** 55 eventos; 0 checkpoints; read_file=2, list_dir=1, run_authorized_command=4, run_command=1. Manifesto c931a3589915.

### 56c15176-0e1a-4393-b0b3-40af3822a841

- **Estado persistido:** COMPLETED; entrega: QUEUED_TO_CHAT.
- **Unidade delegada:** Worker subordinado.
- **Execução, retorno e avaliação:** COMPLETED; 6 ferramentas aprovadas, 0 recusas/erros; 6 comandos em sequencia. Patch de classificacao/estados executado com cinco validacoes; callback falhou por cota.
- **Causa/impacto:** Patch de classificacao/estados executado com cinco validacoes; callback falhou por cota.
- **Correções generalizadas:** C2,C10 (tabela do relatório de causas).
- **Evidência:** 20 eventos; 0 checkpoints; run_authorized_command=6. Manifesto b32e4f9f709c.

### 6744af56-d7cd-475e-8bb2-9dbbd40f2805

- **Estado persistido:** COMPLETED; entrega: QUEUED_TO_CHAT.
- **Unidade delegada:** Corrigir fixture, testar e commitar.
- **Execução, retorno e avaliação:** Comando, teste e commit 88516c5083465f65049883701972d80caef96d31 confirmados; relatório omitiu saída literal pedida.
- **Causa/impacto:** Unidade funcional entregue; omissão textual de evidência recuperada pelo supervisor.
- **Correções generalizadas:** C2,C6 (tabela do relatório de causas).
- **Evidência:** 40 eventos; 2 checkpoints; read_file=2, run_authorized_command=1, git_commit_unit=1. Manifesto 1a27d0320bfa.

### 69143910-7699-4fc5-a59a-be0460921ca4

- **Estado persistido:** FAILED; entrega: QUEUED_TO_CHAT.
- **Unidade delegada:** Worker subordinado.
- **Execução, retorno e avaliação:** FAILED; 9 ferramentas aprovadas, 0 recusas/erros; 0 comandos em sequencia. Checkpoint de leitura virou nove releituras sem conclusao; evidencia preservada sustentou correcao documental c4ed101e.
- **Causa/impacto:** Checkpoint de leitura virou nove releituras sem conclusao; evidencia preservada sustentou correcao documental c4ed101e.
- **Correções generalizadas:** C1,C12 (tabela do relatório de causas).
- **Evidência:** 64 eventos; 5 checkpoints; read_file=9. Manifesto 575ca6a65d54.

### 698aee2b-a18f-40a1-935a-1cd1fd118da8

- **Estado persistido:** COMPLETED; entrega: QUEUED_TO_CHAT.
- **Unidade delegada:** Worker subordinado.
- **Execução, retorno e avaliação:** COMPLETED; 3 ferramentas aprovadas, 0 recusas/erros; 3 comandos em sequencia. Integracao real run/resume e pos-condicao passou; retomada por SR-001 entregou esta unidade ao chat original.
- **Causa/impacto:** Integracao real run/resume e pos-condicao passou; retomada por SR-001 entregou esta unidade ao chat original.
- **Correções generalizadas:** C2,C10 (tabela do relatório de causas).
- **Evidência:** 11 eventos; 0 checkpoints; run_authorized_command=3. Manifesto f3ad86fd6e6d.

### 6a5017eb-e247-459f-a19f-1a43d5656a18

- **Estado persistido:** COMPLETED; entrega: QUEUED_TO_CHAT.
- **Unidade delegada:** Worker subordinado.
- **Execução, retorno e avaliação:** COMPLETED; 2 ferramentas aprovadas, 0 recusas/erros; 2 comandos em sequencia. Builds e suite compilada aprovados; supervisor versionou, mas esgotou cota antes da proxima delegacao. SR-001 retomou sem replay.
- **Causa/impacto:** Builds e suite compilada aprovados; supervisor versionou, mas esgotou cota antes da proxima delegacao. SR-001 retomou sem replay.
- **Correções generalizadas:** C2,C10 (tabela do relatório de causas).
- **Evidência:** 8 eventos; 0 checkpoints; run_authorized_command=2. Manifesto 39629789d128.

### 6a5bd838-ef2e-4dc7-ad6d-5c640c15dfa2

- **Estado persistido:** FAILED; entrega: QUEUED_TO_CHAT.
- **Unidade delegada:** Executar fix-identity-and-test, sem commit.
- **Execução, retorno e avaliação:** Primeira execução passou; reaplicação falhou por assert. Efeito válido preservado.
- **Causa/impacto:** Repetição indevida de mutação já concluída e política de commit incompatível.
- **Correções generalizadas:** C3,C4 (tabela do relatório de causas).
- **Evidência:** 54 eventos; 0 checkpoints; run_authorized_command=4, git_status=1, git_diff=1, run_command=1. Manifesto 2fe1d0a18968.

### 705cf4d3-8f02-4dbd-9d29-2a8afb92f669

- **Estado persistido:** COMPLETED; entrega: QUEUED_TO_CHAT.
- **Unidade delegada:** Worker subordinado.
- **Execução, retorno e avaliação:** COMPLETED; 3 ferramentas aprovadas, 0 recusas/erros; 3 comandos em sequencia. Teste de ordem/elegibilidade/parada adicionado por sequencia, recuperando d3b56ec6.
- **Causa/impacto:** Teste de ordem/elegibilidade/parada adicionado por sequencia, recuperando d3b56ec6.
- **Correções generalizadas:** C2 (tabela do relatório de causas).
- **Evidência:** 11 eventos; 0 checkpoints; run_authorized_command=3. Manifesto 0d549843f81e.

### 7be626fb-4b8a-4f4a-b693-f3847bdefe82

- **Estado persistido:** COMPLETED; entrega: QUEUED_TO_CHAT.
- **Unidade delegada:** Worker subordinado.
- **Execução, retorno e avaliação:** COMPLETED; 3 ferramentas aprovadas, 0 recusas/erros; 0 comandos em sequencia. Teste PDF acumulado real subestimado: uma leitura, edicao e teste aprovado.
- **Causa/impacto:** Teste PDF acumulado real subestimado: uma leitura, edicao e teste aprovado.
- **Correções generalizadas:** C6 (tabela do relatório de causas).
- **Evidência:** 26 eventos; 1 checkpoints; read_file=1, edit_file=1, run_authorized_command=1. Manifesto 4e4cf8e1dcc9.

### 7cd16c0c-23d1-4b8b-ba19-11ce38850105

- **Estado persistido:** FAILED; entrega: QUEUED_TO_CHAT.
- **Unidade delegada:** Implementação em alvos declarados.
- **Execução, retorno e avaliação:** Paths incorretos, sem mudança líquida; FAILED coerente com ausência de implementação.
- **Causa/impacto:** Modelo não adaptou caminhos/ferramentas; guarda de alterações funcionou, mas somente ao final.
- **Correções generalizadas:** C2,C5,C9 (tabela do relatório de causas).
- **Evidência:** 41 eventos; 2 checkpoints; read_file=9. Manifesto 5b524e979091.

### 836c3ede-087c-40e6-bad7-d01467d2785f

- **Estado persistido:** FAILED; entrega: QUEUED_TO_CHAT.
- **Unidade delegada:** Continuar FTs a partir do estado canônico.
- **Execução, retorno e avaliação:** Leituras de .ia/rules/state/continue.ia falharam; sem entrega. Supervisor pediu autorização redundante para nova unidade corretiva.
- **Causa/impacto:** Escopo amplo, inferência de path e interpretação de não reiniciar como proibição de recuperação.
- **Correções generalizadas:** C5,C9 (tabela do relatório de causas).
- **Evidência:** 87 eventos; 5 checkpoints; read_file=10, list_dir=9. Manifesto 4b53d65ddfb0.

### 83cbb4db-bcc2-4a75-845e-63d960bc41b3

- **Estado persistido:** FAILED; entrega: QUEUED_TO_CHAT.
- **Unidade delegada:** Implementação delimitada com comando preparado.
- **Execução, retorno e avaliação:** Sem alteração; leituras/metadados repetidos e Python chamado pelo mecanismo errado.
- **Causa/impacto:** Instrução e capacidade real não reconciliadas; execução do ID não exigida pelo contrato.
- **Correções generalizadas:** C2,C5,C9 (tabela do relatório de causas).
- **Evidência:** 144 eventos; 8 checkpoints; git_status=1, read_file=10, file_info=4, run_command=2. Manifesto 47183f5c5009.

### 84ebdfbf-a3d5-453c-8f81-07aad8cc1cd9

- **Estado persistido:** FAILED; entrega: QUEUED_TO_CHAT.
- **Unidade delegada:** Implementar deduplicação EPUB.
- **Execução, retorno e avaliação:** Doze leituras e duas compactações; nenhuma implementação.
- **Causa/impacto:** Exploração repetida substituiu comando/efeito requerido; evidências recentes descartadas.
- **Correções generalizadas:** C1,C2 (tabela do relatório de causas).
- **Evidência:** 45 eventos; 2 checkpoints; read_file=12. Manifesto 86a88dd4074a.

### 85c8d3a8-699e-4534-9107-9c481eb4298e

- **Estado persistido:** FAILED; entrega: QUEUED_TO_CHAT.
- **Unidade delegada:** Levantamento editorial reduzido aos primeiros trechos.
- **Execução, retorno e avaliação:** Sete leituras, sete compactações, dois subagentes e comando incompatível com leitura; sem resultado. Callback chegou; turno supervisor interrompido.
- **Causa/impacto:** Perda de evidência, mecanismo não disponível conforme contrato e interrupção posterior independente da entrega.
- **Correções generalizadas:** C1,C2,C5,C10 (tabela do relatório de causas).
- **Evidência:** 147 eventos; 7 checkpoints; read_file=7, git_diff=2, run_authorized_command=2, delegate_readonly_subagent=2. Manifesto 2140df6ca9a2.

### 86ad1912-8f39-423d-924c-17cd7b892269

- **Estado persistido:** FAILED; entrega: QUEUED_TO_CHAT.
- **Unidade delegada:** Worker subordinado.
- **Execução, retorno e avaliação:** FAILED; 7 ferramentas aprovadas, 0 recusas/erros; 0 comandos em sequencia. write_file/typecheck ocorreram, mas ausencia de alteracao liquida impediu COMPLETED; codigo recuperado foi revisado/corrigido em b12224f2. Escrita nao equivale a delta.
- **Causa/impacto:** write_file/typecheck ocorreram, mas ausencia de alteracao liquida impediu COMPLETED; codigo recuperado foi revisado/corrigido em b12224f2. Escrita nao equivale a delta.
- **Correções generalizadas:** C6 (tabela do relatório de causas).
- **Evidência:** 69 eventos; 3 checkpoints; read_file=2, run_authorized_command=3, write_file=1, git_status=1. Manifesto 363308c50cbc.

### 87fcc955-0167-4f42-983f-9d5bbc60d7db

- **Estado persistido:** FAILED; entrega: QUEUED_TO_CHAT.
- **Unidade delegada:** Executar text-budget e validar.
- **Execução, retorno e avaliação:** Primeira execução retornou EGW_SOURCE_VERIFICATION_OK; repetição falhou. Alteração permaneceu. Callback chegou; supervisor bloqueado pelo limite da conta.
- **Causa/impacto:** Replay de patch não idempotente; cota do supervisor impediu a etapa seguinte, não o gatilho.
- **Correções generalizadas:** C3,C10 (tabela do relatório de causas).
- **Evidência:** 96 eventos; 7 checkpoints; read_file=10, run_authorized_command=4. Manifesto d0571f681a6e.

### 88ae962c-9fc0-41a5-9bf0-dcc6797c6604

- **Estado persistido:** COMPLETED; entrega: QUEUED_TO_CHAT.
- **Unidade delegada:** Worker subordinado.
- **Execução, retorno e avaliação:** COMPLETED; 5 ferramentas aprovadas, 0 recusas/erros; 5 comandos em sequencia. Baseline Node24 executado com checagem de tipos e quatro suites; evidencia restrita ao executavel testado.
- **Causa/impacto:** Baseline Node24 executado com checagem de tipos e quatro suites; evidencia restrita ao executavel testado.
- **Correções generalizadas:** C2,C6 (tabela do relatório de causas).
- **Evidência:** 17 eventos; 0 checkpoints; run_authorized_command=5. Manifesto 290d5b67dd88.

### 92d264bc-ad30-4a94-9978-aa8715b2e760

- **Estado persistido:** COMPLETED; entrega: TEST_SUPPRESSED.
- **Unidade delegada:** Teste real instalado: ler README linhas 1–3 e devolver título literal.
- **Execução, retorno e avaliação:** COMPLETED com uma read_file, título exato e zero ferramenta mutante. Evidência, recibo e fingerprint de runtime verificados. Entrega TEST_SUPPRESSED por ser teste de contrato, não teste de retomada.
- **Causa/impacto:** Não foi encontrada falha de entrega nesta unidade. Pressão de RAM recuperada por descarregamento do modelo, preservando reserva.
- **Correções generalizadas:** C1,C6,C7 (tabela do relatório de causas).
- **Evidência:** 20 eventos; 0 checkpoints; read_file=1. Manifesto b5101af60a0c.

### 93f4bffe-663c-40c6-b5c9-3723671039b3

- **Estado persistido:** FAILED; entrega: QUEUED_TO_CHAT.
- **Unidade delegada:** Worker subordinado.
- **Execução, retorno e avaliação:** FAILED; 15 ferramentas aprovadas, 2 recusas/erros; 0 comandos em sequencia. Executor ficou parcial apos edicao e validacoes; 13 leituras terminaram em estagnacao, com efeitos preservados.
- **Causa/impacto:** Executor ficou parcial apos edicao e validacoes; 13 leituras terminaram em estagnacao, com efeitos preservados.
- **Correções generalizadas:** C1,C12 (tabela do relatório de causas).
- **Evidência:** 143 eventos; 12 checkpoints; read_file=13, run_authorized_command=3, edit_file=1. Manifesto 94f8962e9ddf.

### 9479e1c3-40e9-4b46-8920-21098913eeb8

- **Estado persistido:** FAILED; entrega: QUEUED_TO_CHAT.
- **Unidade delegada:** FT-104: executar uma vez agents_check para gate oficial de lacuna; sem inferência, edição, atualização efetiva ou retry.
- **Execução, retorno e avaliação:** FAILED; 0 ferramentas aprovadas, 1 recusas/erros; 1 comandos em sequencia. Gate oficial --check retornou erro real; wrapper ocultou detalhe de handoff, recuperado no diagnostico efe47108.
- **Causa/impacto:** Gate oficial --check retornou erro real; wrapper ocultou detalhe de handoff, recuperado no diagnostico efe47108.
- **Correções generalizadas:** C2,C9 (tabela do relatório de causas).
- **Evidência:** 3 eventos; 0 checkpoints; run_authorized_command=1. Manifesto 936e53587914.

### 99f89f39-da51-4085-8752-cac459ee1486

- **Estado persistido:** FAILED; entrega: QUEUED_TO_CHAT.
- **Unidade delegada:** Adicionar teste spine, validar e commitar.
- **Execução, retorno e avaliação:** Comando produziu teste, passou e criou 2d20887340; runtime reportou FAILED por contador de commits zero.
- **Causa/impacto:** Detector contabilizava somente git_commit_unit, ignorando commit legítimo feito pelo comando autorizado.
- **Correções generalizadas:** C4 (tabela do relatório de causas).
- **Evidência:** 34 eventos; 1 checkpoints; read_file=3, run_authorized_command=1, git_commit_unit=1. Manifesto 4ab319d01dea.

### 9e62c36b-cbd7-498e-bcd2-92c154a41962

- **Estado persistido:** COMPLETED; entrega: QUEUED_TO_CHAT.
- **Unidade delegada:** Worker subordinado.
- **Execução, retorno e avaliação:** COMPLETED; 3 ferramentas aprovadas, 0 recusas/erros; 3 comandos em sequencia. Continuidade materialmente corrigida de 0636b4d3: preflight de hashes, prepare e verify executados uma vez, tres comandos aprovados e delta nos dois alvos. Conclusao do Worker nao comprova fechamento da FT; callback encontrou cota esgotada. Ponte atualizada evitou MCP com modulo legado em memoria.
- **Causa/impacto:** Continuidade materialmente corrigida de 0636b4d3: preflight de hashes, prepare e verify executados uma vez, tres comandos aprovados e delta nos dois alvos. Conclusao do Worker nao comprova fechamento da FT; callback encontrou cota esgotada. Ponte atualizada evitou MCP com modulo legado em memoria.
- **Correções generalizadas:** C2,C3,C10,C11,C14 (tabela do relatório de causas).
- **Evidência:** 11 eventos; 0 checkpoints; run_authorized_command=3. Manifesto b02cec06c59b.

### 9eeded63-3d66-424f-973e-843fe338e167

- **Estado persistido:** FAILED; entrega: QUEUED_TO_CHAT.
- **Unidade delegada:** Worker subordinado.
- **Execução, retorno e avaliação:** FAILED; 13 ferramentas aprovadas, 2 recusas/erros; 0 comandos em sequencia. Teste parcialmente alterado; revalidacao falhou/estagnou. Unidade 3a1648f0 corrigiu, preservando o parcial.
- **Causa/impacto:** Teste parcialmente alterado; revalidacao falhou/estagnou. Unidade 3a1648f0 corrigiu, preservando o parcial.
- **Correções generalizadas:** C3,C12 (tabela do relatório de causas).
- **Evidência:** 117 eventos; 9 checkpoints; read_file=9, edit_file=2, run_authorized_command=4. Manifesto fe27aa85b7a6.

### a6711cb4-7a4a-425f-b78e-6f25ec1c1d2d

- **Estado persistido:** FAILED; entrega: QUEUED_TO_CHAT.
- **Unidade delegada:** Worker subordinado.
- **Execução, retorno e avaliação:** FAILED; 2 ferramentas aprovadas, 1 recusas/erros; 3 comandos em sequencia. Build ESM falhou sob package.json CommonJS; supervisor havia presumido semantica da raiz. 21365a86 corrigiu formato.
- **Causa/impacto:** Build ESM falhou sob package.json CommonJS; supervisor havia presumido semantica da raiz. 21365a86 corrigiu formato.
- **Correções generalizadas:** C9 (tabela do relatório de causas).
- **Evidência:** 9 eventos; 0 checkpoints; run_authorized_command=3. Manifesto e4234cf9368d.

### a85abf9a-36cc-46b0-9ea6-591512f7c716

- **Estado persistido:** FAILED; entrega: QUEUED_TO_CHAT.
- **Unidade delegada:** Patch e teste delimitados.
- **Execução, retorno e avaliação:** Patch/teste passaram; commit tentou .ia/rules em vez de .ia.rules. Supervisor registrou 5c40d1d570.
- **Causa/impacto:** Path inferido incorreto na finalização; recuperação pelo supervisor preservou efeito.
- **Correções generalizadas:** C4,C5 (tabela do relatório de causas).
- **Evidência:** 41 eventos; 1 checkpoints; run_authorized_command=2, git_commit_unit=1, git_status=1, git_diff=1. Manifesto 2a5ca41fbeb6.

### a94c101d-861c-4217-9029-451296963c78

- **Estado persistido:** COMPLETED; entrega: QUEUED_TO_CHAT.
- **Unidade delegada:** Criar guia e commitar.
- **Execução, retorno e avaliação:** Comando/teste/commit a36fa7f710858453fff854618be8851eb9c4e03c confirmados; entrega delimitada aceita.
- **Causa/impacto:** Sem defeito adicional comprovado nesta unidade.
- **Correções generalizadas:** C2,C6 (tabela do relatório de causas).
- **Evidência:** 29 eventos; 0 checkpoints; run_authorized_command=1, run_command=1, file_info=1, git_commit_unit=1. Manifesto 94ed9dd695f0.

### ab2ab50e-2917-4428-944c-a87dae966ce2

- **Estado persistido:** COMPLETED; entrega: QUEUED_TO_CHAT.
- **Unidade delegada:** Worker subordinado.
- **Execução, retorno e avaliação:** COMPLETED; 1 ferramentas aprovadas, 0 recusas/erros; 1 comandos em sequencia. Inventario de rastreabilidade apontou10 materiais/0 mapeadas e gate externo; diagnostico nao e conclusao da FT.
- **Causa/impacto:** Inventario de rastreabilidade apontou10 materiais/0 mapeadas e gate externo; diagnostico nao e conclusao da FT.
- **Correções generalizadas:** C2,C6 (tabela do relatório de causas).
- **Evidência:** 5 eventos; 0 checkpoints; run_authorized_command=1. Manifesto bc3a74328522.

### abe917cd-32c3-4925-94c1-cabd719411cc

- **Estado persistido:** COMPLETED; entrega: QUEUED_TO_CHAT.
- **Unidade delegada:** Worker subordinado.
- **Execução, retorno e avaliação:** COMPLETED; 3 ferramentas aprovadas, 0 recusas/erros; 0 comandos em sequencia. Um caso PDF recuperou cdd74993 com leitura/edicao/teste delimitados.
- **Causa/impacto:** Um caso PDF recuperou cdd74993 com leitura/edicao/teste delimitados.
- **Correções generalizadas:** C6 (tabela do relatório de causas).
- **Evidência:** 26 eventos; 1 checkpoints; read_file=1, edit_file=1, run_authorized_command=1. Manifesto 78edc305c266.

### aeac491f-6da5-4b2b-9bee-9136afaee5eb

- **Estado persistido:** COMPLETED; entrega: QUEUED_TO_CHAT.
- **Unidade delegada:** Revisar três Skills existentes.
- **Execução, retorno e avaliação:** COMPLETED com apenas git_status; descrição da estrutura/conteúdo inventada e rejeitada pelo supervisor.
- **Causa/impacto:** Guarda de inspeção aceitava metadados como prova de revisão de arquivos; alucinação sem fonte.
- **Correções generalizadas:** C6 (tabela do relatório de causas).
- **Evidência:** 15 eventos; 0 checkpoints; git_status=1. Manifesto dd23f78fa9e6.

### b12224f2-98c7-4da2-898b-00c13b97d28d

- **Estado persistido:** COMPLETED; entrega: QUEUED_TO_CHAT.
- **Unidade delegada:** Worker subordinado.
- **Execução, retorno e avaliação:** COMPLETED; 7 ferramentas aprovadas, 0 recusas/erros; 0 comandos em sequencia. Correcao da API recuperada de 86ad1912 validou tipos/comportamento; revisao do supervisor continua necessaria para contrato completo.
- **Causa/impacto:** Correcao da API recuperada de 86ad1912 validou tipos/comportamento; revisao do supervisor continua necessaria para contrato completo.
- **Correções generalizadas:** C6 (tabela do relatório de causas).
- **Evidência:** 61 eventos; 3 checkpoints; read_file=3, run_authorized_command=3, edit_file=1. Manifesto 3ca2ea46f27a.

### b5f0a09a-cb2a-4273-9549-5ec256957bfc

- **Estado persistido:** COMPLETED; entrega: QUEUED_TO_CHAT.
- **Unidade delegada:** Worker subordinado.
- **Execução, retorno e avaliação:** COMPLETED; 3 ferramentas aprovadas, 0 recusas/erros; 0 comandos em sequencia. Patch cirurgico PDF e teste aprovados, recuperando tentativa nao unica de 46f217a3.
- **Causa/impacto:** Patch cirurgico PDF e teste aprovados, recuperando tentativa nao unica de 46f217a3.
- **Correções generalizadas:** C5,C6 (tabela do relatório de causas).
- **Evidência:** 36 eventos; 2 checkpoints; read_file=1, edit_file=1, run_authorized_command=1. Manifesto 4523d05d146c.

### c23fd8a5-f82d-4309-82af-76dcb0c4db84

- **Estado persistido:** FAILED; entrega: QUEUED_TO_CHAT.
- **Unidade delegada:** Worker subordinado.
- **Execução, retorno e avaliação:** FAILED; 7 ferramentas aprovadas, 0 recusas/erros; 0 comandos em sequencia. Correcao do executor repetiu sete leituras sem editar; sequencia 3fc8d540 recuperou.
- **Causa/impacto:** Correcao do executor repetiu sete leituras sem editar; sequencia 3fc8d540 recuperou.
- **Correções generalizadas:** C1,C12 (tabela do relatório de causas).
- **Evidência:** 59 eventos; 5 checkpoints; read_file=7. Manifesto 4691566056bd.

### c4ed101e-1ff3-4025-bb1c-ba15942dcab6

- **Estado persistido:** COMPLETED; entrega: QUEUED_TO_CHAT.
- **Unidade delegada:** Worker subordinado.
- **Execução, retorno e avaliação:** COMPLETED; 3 ferramentas aprovadas, 0 recusas/erros; 0 comandos em sequencia. Guia PDF corrigido a partir de evidencia recuperada: leitura unica, edit e diff_check aprovados.
- **Causa/impacto:** Guia PDF corrigido a partir de evidencia recuperada: leitura unica, edit e diff_check aprovados.
- **Correções generalizadas:** C6 (tabela do relatório de causas).
- **Evidência:** 30 eventos; 0 checkpoints; read_file=1, edit_file=1, run_authorized_command=1. Manifesto 9858f796cbc1.

### c62c960c-f7f1-43ef-96e0-c652db212c41

- **Estado persistido:** COMPLETED; entrega: QUEUED_TO_CHAT.
- **Unidade delegada:** Worker subordinado.
- **Execução, retorno e avaliação:** COMPLETED; 3 ferramentas aprovadas, 0 recusas/erros; 3 comandos em sequencia. Checkpoint e projecao sincronizados pela API oficial sem repetir testes funcionais.
- **Causa/impacto:** Checkpoint e projecao sincronizados pela API oficial sem repetir testes funcionais.
- **Correções generalizadas:** C2 (tabela do relatório de causas).
- **Evidência:** 11 eventos; 0 checkpoints; run_authorized_command=3. Manifesto e0af48e97a22.

### c675a003-11e9-437c-bbba-e71fdac0b5a9

- **Estado persistido:** FAILED; entrega: QUEUED_TO_CHAT.
- **Unidade delegada:** Worker subordinado.
- **Execução, retorno e avaliação:** FAILED; 4 ferramentas aprovadas, 2 recusas/erros; 0 comandos em sequencia. Modelo leu arquivo novo inexistente e executou types antes de cria-lo; da2d215d corrigiu ordem por sequencia.
- **Causa/impacto:** Modelo leu arquivo novo inexistente e executou types antes de cria-lo; da2d215d corrigiu ordem por sequencia.
- **Correções generalizadas:** C2,C5,C12 (tabela do relatório de causas).
- **Evidência:** 61 eventos; 3 checkpoints; read_file=5, run_authorized_command=1. Manifesto 109d2f84f3ab.

### c76f3c74-3d4c-4f47-ad06-b04c649de01f

- **Estado persistido:** FAILED; entrega: QUEUED_TO_CHAT.
- **Unidade delegada:** Acrescentar teste novo.
- **Execução, retorno e avaliação:** Executou suite existente repetidamente, sem adicionar teste. FAILED corretamente impediu sucesso falso.
- **Causa/impacto:** Comando de validação confundido com implementação solicitada; falta de evidência mínima por artefato.
- **Correções generalizadas:** C2,C6,C9 (tabela do relatório de causas).
- **Evidência:** 83 eventos; 4 checkpoints; git_status=4, read_file=4, run_authorized_command=2, git_diff=1. Manifesto 5b93cbd20977.

### cca28055-65ea-489a-92a7-617d00019231

- **Estado persistido:** FAILED; entrega: QUEUED_TO_CHAT.
- **Unidade delegada:** Aplicar comando de limites EPUB.
- **Execução, retorno e avaliação:** Comando ignorado; onze leituras e duas compactações. Supervisor depois aplicou e registrou 2dc069871b.
- **Causa/impacto:** Execução preparada não era obrigatória e inferência substituiu ação por análise.
- **Correções generalizadas:** C1,C2 (tabela do relatório de causas).
- **Evidência:** 40 eventos; 2 checkpoints; read_file=11. Manifesto 25479fd97cc0.

### cdd74993-1172-4ddd-b731-7941e2422745

- **Estado persistido:** FAILED; entrega: QUEUED_TO_CHAT.
- **Unidade delegada:** Worker subordinado.
- **Execução, retorno e avaliação:** FAILED; 9 ferramentas aprovadas, 1 recusas/erros; 0 comandos em sequencia. Dois casos PDF nao escritos; dez releituras e bloqueio antecipado, recuperados por unidades menores.
- **Causa/impacto:** Dois casos PDF nao escritos; dez releituras e bloqueio antecipado, recuperados por unidades menores.
- **Correções generalizadas:** C1,C12 (tabela do relatório de causas).
- **Evidência:** 80 eventos; 8 checkpoints; read_file=10. Manifesto 9e11c0ba077a.

### d3b56ec6-fca2-4dda-be83-5ae58d147366

- **Estado persistido:** FAILED; entrega: QUEUED_TO_CHAT.
- **Unidade delegada:** Worker subordinado.
- **Execução, retorno e avaliação:** FAILED; 6 ferramentas aprovadas, 0 recusas/erros; 0 comandos em sequencia. Seis releituras sem acrescer teste; callback esgotou cota; 705cf4d3 recuperou por sequencia.
- **Causa/impacto:** Seis releituras sem acrescer teste; callback esgotou cota; 705cf4d3 recuperou por sequencia.
- **Correções generalizadas:** C1,C10,C12 (tabela do relatório de causas).
- **Evidência:** 47 eventos; 4 checkpoints; read_file=6. Manifesto 8ce7a314414d.

### d5fbcef2-3bc2-4646-96a9-b30dc520aa31

- **Estado persistido:** COMPLETED; entrega: QUEUED_TO_CHAT.
- **Unidade delegada:** Worker subordinado.
- **Execução, retorno e avaliação:** COMPLETED; 1 ferramentas aprovadas, 0 recusas/erros; 0 comandos em sequencia. Leitura unica do modulo produziu checkpoint arquitetural; cota do supervisor bloqueou callback.
- **Causa/impacto:** Leitura unica do modulo produziu checkpoint arquitetural; cota do supervisor bloqueou callback.
- **Correções generalizadas:** C6,C10 (tabela do relatório de causas).
- **Evidência:** 13 eventos; 0 checkpoints; read_file=1. Manifesto 160dab8966a0.

### da2d215d-6a6b-442d-87ab-44187379e2a9

- **Estado persistido:** COMPLETED; entrega: QUEUED_TO_CHAT.
- **Unidade delegada:** Worker subordinado.
- **Execução, retorno e avaliação:** COMPLETED; 3 ferramentas aprovadas, 0 recusas/erros; 3 comandos em sequencia. Classificador criado antes de types/matrix por sequencia exata; corrigiu fonte ausente.
- **Causa/impacto:** Classificador criado antes de types/matrix por sequencia exata; corrigiu fonte ausente.
- **Correções generalizadas:** C2 (tabela do relatório de causas).
- **Evidência:** 11 eventos; 0 checkpoints; run_authorized_command=3. Manifesto 4ab714389244.

### e0d22b19-c4a1-4fc6-94de-9ea4b822e151

- **Estado persistido:** FAILED; entrega: QUEUED_TO_CHAT.
- **Unidade delegada:** Continuar unidade pendente.
- **Execução, retorno e avaliação:** Resposta final sem qualquer ferramenta; FAILED coerente. Supervisor encerrou bloqueado sem unidade corretiva.
- **Causa/impacto:** Modelo não inspecionou; recuperação confundida com repetição proibida de job.
- **Correções generalizadas:** C6,C9 (tabela do relatório de causas).
- **Evidência:** 11 eventos; 0 checkpoints; sem eventos de ferramenta retidos. Manifesto dd517834fa5f.

### e2491ebb-d3b1-4354-8d5b-48eaba4b63cd

- **Estado persistido:** FAILED; entrega: QUEUED_TO_CHAT.
- **Unidade delegada:** Worker subordinado.
- **Execução, retorno e avaliação:** FAILED; 5 ferramentas aprovadas, 4 recusas/erros; 0 comandos em sequencia. Diretorio ausente e node -e nao autorizado pelo mecanismo usado; nao ampliou permissao, mas sem implementacao.
- **Causa/impacto:** Diretorio ausente e node -e nao autorizado pelo mecanismo usado; nao ampliou permissao, mas sem implementacao.
- **Correções generalizadas:** C5,C9,C12 (tabela do relatório de causas).
- **Evidência:** 42 eventos; 2 checkpoints; read_file=4, list_dir=3, run_command=2. Manifesto 751689bc1dab.

### e52799f4-32ac-4904-a663-b464393fc70f

- **Estado persistido:** FAILED; entrega: QUEUED_TO_CHAT.
- **Unidade delegada:** Integrar e validar Skill.
- **Execução, retorno e avaliação:** Integração aplicada; validate-skill falhou com ModuleNotFoundError yaml. Supervisor corrigiu dependência e registrou 801d708da1.
- **Causa/impacto:** Pré-validação de dependências do script delegado incompleta; guarda de teste falho funcionou.
- **Correções generalizadas:** C2,C9 (tabela do relatório de causas).
- **Evidência:** 39 eventos; 2 checkpoints; read_file=4, run_authorized_command=2. Manifesto efaf0e38e05a.

### e6cd3e35-ee34-4da5-af48-3ed7b53f5805

- **Estado persistido:** FAILED; entrega: QUEUED_TO_CHAT.
- **Unidade delegada:** Worker subordinado.
- **Execução, retorno e avaliação:** FAILED; 6 ferramentas aprovadas, 0 recusas/erros; 0 comandos em sequencia. Seis leituras substituiriam testes de clonagem; guard interrompeu, 2534f348 recuperou sem inferencia.
- **Causa/impacto:** Seis leituras substituiriam testes de clonagem; guard interrompeu, 2534f348 recuperou sem inferencia.
- **Correções generalizadas:** C1,C12 (tabela do relatório de causas).
- **Evidência:** 51 eventos; 4 checkpoints; read_file=6. Manifesto 21ea6eedfb75.

### e790bc2a-5339-4404-a892-a99edeb91e98

- **Estado persistido:** COMPLETED; entrega: QUEUED_TO_CHAT.
- **Unidade delegada:** Worker subordinado.
- **Execução, retorno e avaliação:** COMPLETED; 3 ferramentas aprovadas, 0 recusas/erros; 3 comandos em sequencia. Matriz do classificador persistida e validada por sequencia.
- **Causa/impacto:** Matriz do classificador persistida e validada por sequencia.
- **Correções generalizadas:** C2 (tabela do relatório de causas).
- **Evidência:** 11 eventos; 0 checkpoints; run_authorized_command=3. Manifesto 2abd7e3c68a4.

### ec0fa6fb-a827-43f2-ac39-169126d950db

- **Estado persistido:** FAILED; entrega: QUEUED_TO_CHAT.
- **Unidade delegada:** Analisar evidência fornecida, sem novas ferramentas.
- **Execução, retorno e avaliação:** Runtime exigiu inspeção; dez compactações, dezesseis leituras e três diffs não produziram entrega.
- **Causa/impacto:** Contradição entre objetivo de análise fornecida e guarda universal de ferramenta obrigatória.
- **Correções generalizadas:** C7 (tabela do relatório de causas).
- **Evidência:** 129 eventos; 10 checkpoints; read_file=16, git_diff=3. Manifesto 82c00481f03b.

### ee2343ff-daf0-4c43-9cff-6de89e6bf546

- **Estado persistido:** FAILED; entrega: QUEUED_TO_CHAT.
- **Unidade delegada:** Criar documentação por comando autorizado.
- **Execução, retorno e avaliação:** Comando não executado, nenhuma mudança; guarda de alterações recusou conclusão.
- **Causa/impacto:** Permissão para comando não traduzida em obrigação de execução.
- **Correções generalizadas:** C2,C6 (tabela do relatório de causas).
- **Evidência:** 88 eventos; 4 checkpoints; git_status=4, read_file=2, search_text=4. Manifesto d12bce0551e1.

### ef363c09-0d86-4058-9b06-a3e0680210aa

- **Estado persistido:** FAILED; entrega: QUEUED_TO_CHAT.
- **Unidade delegada:** Corrigir fixture e validar.
- **Execução, retorno e avaliação:** Leituras repetidas; teste apontou metadados ausentes, sem correção. Recuperação entregue em 6744af56.
- **Causa/impacto:** Correção não executada antes da validação e estratégia sem adaptação útil.
- **Correções generalizadas:** C2,C5 (tabela do relatório de causas).
- **Evidência:** 38 eventos; 2 checkpoints; read_file=7, run_authorized_command=1. Manifesto 196c5d098fcd.

### efe47108-03f8-42f9-a73a-222092c524af

- **Estado persistido:** FAILED; entrega: QUEUED_TO_CHAT.
- **Unidade delegada:** FT-104 diagnóstico determinístico, sem inferência.
- **Execução, retorno e avaliação:** FAILED; 0 ferramentas aprovadas, 1 recusas/erros; 1 comandos em sequencia. Diagnostico oficial exposto: release v0.1.14-rc5 exige atualizar package.json. Gate permaneceu falho; correto nao declarar conclusao.
- **Causa/impacto:** Diagnostico oficial exposto: release v0.1.14-rc5 exige atualizar package.json. Gate permaneceu falho; correto nao declarar conclusao.
- **Correções generalizadas:** C2,C9 (tabela do relatório de causas).
- **Evidência:** 3 eventos; 0 checkpoints; run_authorized_command=1. Manifesto 1afc75f99d37.

### f02aebfe-b77d-4a48-a72e-fe7859e2f353

- **Estado persistido:** FAILED; entrega: QUEUED_TO_CHAT.
- **Unidade delegada:** Worker subordinado.
- **Execução, retorno e avaliação:** FAILED; 2 ferramentas aprovadas, 1 recusas/erros; 0 comandos em sequencia. Verificacao TS6053 sem criacao do arquivo; CONTRACT_UNFULFILLED preservou falha em vez de sucesso textual.
- **Causa/impacto:** Verificacao TS6053 sem criacao do arquivo; CONTRACT_UNFULFILLED preservou falha em vez de sucesso textual.
- **Correções generalizadas:** C2,C6,C12 (tabela do relatório de causas).
- **Evidência:** 27 eventos; 1 checkpoints; read_file=2, run_authorized_command=1. Manifesto 5d39424038ef.

### f5c61306-083c-4abe-a67b-a491ed20f7dc

- **Estado persistido:** FAILED; entrega: QUEUED_TO_CHAT.
- **Unidade delegada:** Ler contexto e produzir guia.
- **Execução, retorno e avaliação:** read-guide-context passou repetidamente; guia não produzido e path incorreto. Unidade a94c101d entregou depois.
- **Causa/impacto:** Leitura preparada tratada como entrega inteira; sucesso repetido sem progressão para artefato.
- **Correções generalizadas:** C2,C3,C5 (tabela do relatório de causas).
- **Evidência:** 78 eventos; 6 checkpoints; run_authorized_command=4, read_file=6. Manifesto 0278f5926060.

### fa74c6a7-2147-43b0-aec8-95945467920b

- **Estado persistido:** COMPLETED; entrega: TEST_SUPPRESSED.
- **Unidade delegada:** Teste real instalado: criar fixture exclusivo com conteúdo literal e restaurar baseline.
- **Execução, retorno e avaliação:** COMPLETED com uma write_file, zero erros e conteúdo exato. Harness confirmou remoção segura e Git/arquivos não rastreados preservados; test-verification.json registra ok.
- **Causa/impacto:** Nenhuma falha observada nesta unidade. A seção Git do resultado registra o fixture antes da limpeza; o recibo posterior comprova restauração. TEST_SUPPRESSED delimita este teste de escrita, sem teste de retomada.
- **Correções generalizadas:** C4,C6 (tabela do relatório de causas).
- **Evidência:** 15 eventos; 0 checkpoints; write_file=1. Manifesto 3f3acb59c1a0.

### fad92f07-e0c6-4b38-916c-de6f5f3def67

- **Estado persistido:** FAILED; entrega: QUEUED_TO_CHAT.
- **Unidade delegada:** Corrigir divergência delimitada.
- **Execução, retorno e avaliação:** Seis leituras e duas compactações; nenhuma alteração.
- **Causa/impacto:** Perda de evidência e execução convertida em exploração improdutiva.
- **Correções generalizadas:** C1,C2 (tabela do relatório de causas).
- **Evidência:** 30 eventos; 2 checkpoints; read_file=6. Manifesto df06e5da4b98.

## Fixtures de integração, individualmente

Estes pedidos pediam deliberadamente leitura simulada, falha HTTP ou reconciliação de órfão. Cada linha foi reconciliada com seu pedido, resultado/erro e artefatos, sem atribuir sucesso de negócio a fixtures. Ausência de logs antigos limita a prova histórica; novos recibos não são retroativos. C8 trata a acumulação de fixtures; os históricos auditados não foram apagados.

| Job | Estado | Avaliação do objetivo real | Evidência e lacunas |
| --- | --- | --- | --- |
| 002b83ae-69a7-4453-b343-1fc50fab59c4 | COMPLETED | Fixture de leitura com modelo simulado; resultado/Git persistidos, não comprova inferência real. Recusas de escrita, quando presentes, são esperadas em read-only. | 12 eventos; f6577c57e520; resultado/erro e Git retidos |
| 04ab7871-76c1-4301-a017-2ecf9a7646fe | FAILED | HTTP500 simulado: falha esperada de infraestrutura; retries limitados e estado terminal coerente. Não é defeito produtivo do modelo. | 3 eventos; 751ae7f33066; seção Git ausente |
| 0af7ddee-28db-4e8f-bbd8-954c35943b24 | FAILED | HTTP500 simulado: falha esperada de infraestrutura; retries limitados e estado terminal coerente. Não é defeito produtivo do modelo. | 4 eventos; 83418b69fa44; seção Git ausente |
| 0b283e75-79b6-43dc-ba28-3d4f893a2539 | FAILED | Runner/heartbeat inválido simulado; reconciliação para FAILED era o resultado esperado, sem sucesso fictício. | 0 eventos; 4f6976d6c42e; timeline ausente |
| 0d61b004-418e-4089-b9fe-065792cae5a1 | COMPLETED | Fixture de leitura com modelo simulado; resultado/Git persistidos, não comprova inferência real. Recusas de escrita, quando presentes, são esperadas em read-only. | 8 eventos; 144280f7bd17; resultado/erro e Git retidos |
| 1363af03-c110-4800-89f9-fbbb1cf5cf20 | FAILED | Runner/heartbeat inválido simulado; reconciliação para FAILED era o resultado esperado, sem sucesso fictício. | 0 eventos; 4239619f4daf; timeline ausente |
| 13f47abd-6da3-45cc-9b23-7c1052b6ebb6 | FAILED | Runner/heartbeat inválido simulado; reconciliação para FAILED era o resultado esperado, sem sucesso fictício. | 0 eventos; c3f52e1ebd7a; timeline ausente, seção Git ausente |
| 14cf0bac-3a85-40de-b160-4182606c5ba2 | COMPLETED | Fixture de leitura com modelo simulado; resultado/Git persistidos, não comprova inferência real. Recusas de escrita, quando presentes, são esperadas em read-only. | 10 eventos; f147a931b858; resultado/erro e Git retidos |
| 15b2cd13-177f-48a2-810f-97af5251fbd4 | FAILED | Runner/heartbeat inválido simulado; reconciliação para FAILED era o resultado esperado, sem sucesso fictício. | 0 eventos; b1006767b7bf; timeline ausente |
| 1a12220b-a822-455e-94c7-0da19976e390 | FAILED | HTTP500 simulado: falha esperada de infraestrutura; retries limitados e estado terminal coerente. Não é defeito produtivo do modelo. | 3 eventos; 6ec4aa8459d4; seção Git ausente |
| 1bd3bb82-0ae9-4073-adbd-e576d5763e15 | FAILED | HTTP500 simulado: falha esperada de infraestrutura; retries limitados e estado terminal coerente. Não é defeito produtivo do modelo. | 3 eventos; 4e126ab4e531; seção Git ausente |
| 1d6e77f0-14a4-4352-9cbd-ac11b863f116 | COMPLETED | Fixture de leitura com modelo simulado; resultado/Git persistidos, não comprova inferência real. Recusas de escrita, quando presentes, são esperadas em read-only. | 10 eventos; b044f9366b3d; resultado/erro e Git retidos |
| 2184719b-a8c0-41c0-9673-dc3e8a607e69 | FAILED | Runner/heartbeat inválido simulado; reconciliação para FAILED era o resultado esperado, sem sucesso fictício. | 0 eventos; 9c998a53f3a7; timeline ausente |
| 2343898b-6108-4184-b88c-001b9de1ef55 | FAILED | HTTP500 simulado: falha esperada de infraestrutura; retries limitados e estado terminal coerente. Não é defeito produtivo do modelo. | 0 eventos; 083839c84800; timeline ausente, seção Git ausente |
| 29b4b6d7-b3c9-4ea8-ac4b-5080a02421cd | COMPLETED | Fixture de leitura com modelo simulado; resultado/Git persistidos, não comprova inferência real. Recusas de escrita, quando presentes, são esperadas em read-only. | 8 eventos; 753b1177ee6a; resultado/erro e Git retidos |
| 2be6d42a-4594-4cf6-a119-561c230a48a0 | FAILED | HTTP500 simulado: falha esperada de infraestrutura; retries limitados e estado terminal coerente. Não é defeito produtivo do modelo. | 3 eventos; 4422162c5f41; seção Git ausente |
| 2eab784f-2730-43f8-abd2-7fd5711e7de4 | FAILED | HTTP500 simulado: falha esperada de infraestrutura; retries limitados e estado terminal coerente. Não é defeito produtivo do modelo. | 4 eventos; 2fbd4eb7779d; seção Git ausente |
| 30af16b1-7690-4931-8903-91943b7483d2 | COMPLETED | Fixture de leitura com modelo simulado; resultado/Git persistidos, não comprova inferência real. Recusas de escrita, quando presentes, são esperadas em read-only. | 12 eventos; d77d7fac908b; resultado/erro e Git retidos |
| 32ef20d1-b3d1-4db5-86d0-b378afd3f7be | FAILED | HTTP500 simulado: falha esperada de infraestrutura; retries limitados e estado terminal coerente. Não é defeito produtivo do modelo. | 4 eventos; f2667d67e6e2; seção Git ausente |
| 349dc012-d23c-482a-bbe3-7bffc93e9cef | COMPLETED | Fixture de leitura com modelo simulado; resultado/Git persistidos, não comprova inferência real. Recusas de escrita, quando presentes, são esperadas em read-only. | 12 eventos; 54e7d14c0adc; resultado/erro e Git retidos |
| 34fb497a-6e10-4d22-9e49-2aedf46317a7 | COMPLETED | Fixture de leitura com modelo simulado; resultado/Git persistidos, não comprova inferência real. Recusas de escrita, quando presentes, são esperadas em read-only. | 0 eventos; 9e472f7081c4; timeline ausente, seção Git ausente |
| 36862cc4-ea4b-4b5e-a118-a17089320330 | FAILED | HTTP500 simulado: falha esperada de infraestrutura; retries limitados e estado terminal coerente. Não é defeito produtivo do modelo. | 3 eventos; 397bd6e31c5a; seção Git ausente |
| 37a1e203-3f16-40c3-bd71-40ba3cc66045 | FAILED | Runner/heartbeat inválido simulado; reconciliação para FAILED era o resultado esperado, sem sucesso fictício. | 0 eventos; 4bd8b6d2bef4; timeline ausente |
| 37e18ef0-b31e-467f-86b9-67126c9ec25d | FAILED | Runner/heartbeat inválido simulado; reconciliação para FAILED era o resultado esperado, sem sucesso fictício. | 0 eventos; 210a70d74e59; timeline ausente |
| 3a3835c7-0636-43fc-a7d1-90f8c55dbf79 | FAILED | HTTP500 simulado: falha esperada de infraestrutura; retries limitados e estado terminal coerente. Não é defeito produtivo do modelo. | 4 eventos; 6870f2f8d80f; seção Git ausente |
| 3d6d2c76-1dbf-4cd5-b36d-221f06bc2a05 | COMPLETED | Fixture de leitura com modelo simulado; resultado/Git persistidos, não comprova inferência real. Recusas de escrita, quando presentes, são esperadas em read-only. | 10 eventos; 20fc769b5b2d; resultado/erro e Git retidos |
| 402c181d-c873-41d1-b62b-02918bf1e7ad | FAILED | Runner/heartbeat inválido simulado; reconciliação para FAILED era o resultado esperado, sem sucesso fictício. | 0 eventos; 366871da276e; timeline ausente |
| 407f3146-13f9-406e-8d08-44a23fcacb03 | COMPLETED | Fixture de leitura com modelo simulado; resultado/Git persistidos, não comprova inferência real. Recusas de escrita, quando presentes, são esperadas em read-only. | 0 eventos; abf966344503; timeline ausente, seção Git ausente |
| 43288595-d2ca-4c29-8497-16506036502d | FAILED | HTTP500 simulado: falha esperada de infraestrutura; retries limitados e estado terminal coerente. Não é defeito produtivo do modelo. | 8 eventos; 6c58db45722a; seção Git ausente |
| 45931965-836a-46f1-9048-92d284d91930 | COMPLETED | Fixture de leitura com modelo simulado; resultado/Git persistidos, não comprova inferência real. Recusas de escrita, quando presentes, são esperadas em read-only. | 10 eventos; 1558fe40afb5; resultado/erro e Git retidos |
| 46861072-d9f6-42d4-b33c-46795d9ecdc5 | FAILED | HTTP500 simulado: falha esperada de infraestrutura; retries limitados e estado terminal coerente. Não é defeito produtivo do modelo. | 4 eventos; d33b37d8b27c; seção Git ausente |
| 4710b2d9-8c9b-47ed-9531-7e21d916bcf6 | COMPLETED | Fixture de leitura com modelo simulado; resultado/Git persistidos, não comprova inferência real. Recusas de escrita, quando presentes, são esperadas em read-only. | 8 eventos; 3a90c3a30ace; resultado/erro e Git retidos |
| 4822eb0a-6332-41e8-a9f9-a1c650749128 | FAILED | HTTP500 simulado: falha esperada de infraestrutura; retries limitados e estado terminal coerente. Não é defeito produtivo do modelo. | 3 eventos; 4b5d771aeffa; seção Git ausente |
| 4b0b585a-cd01-41db-98e6-9180c9eded98 | COMPLETED | Fixture de leitura com modelo simulado; resultado/Git persistidos, não comprova inferência real. Recusas de escrita, quando presentes, são esperadas em read-only. | 12 eventos; fad28f1a736e; resultado/erro e Git retidos |
| 5096dfd1-359d-4978-a1f8-1116360408f0 | FAILED | Runner/heartbeat inválido simulado; reconciliação para FAILED era o resultado esperado, sem sucesso fictício. | 0 eventos; 3b81e9489382; timeline ausente |
| 521e66c6-adf0-4269-92c5-889c54ca2c81 | FAILED | HTTP500 simulado: falha esperada de infraestrutura; retries limitados e estado terminal coerente. Não é defeito produtivo do modelo. | 4 eventos; 1376f1dd65dc; seção Git ausente |
| 525841a8-acf6-4bbc-a660-1e5e66e954e6 | COMPLETED | Fixture de leitura com modelo simulado; resultado/Git persistidos, não comprova inferência real. Recusas de escrita, quando presentes, são esperadas em read-only. | 10 eventos; d1aaecd0b1af; resultado/erro e Git retidos |
| 57c91356-ddf6-4b0e-81f5-29f84abb8a13 | COMPLETED | Fixture de leitura com modelo simulado; resultado/Git persistidos, não comprova inferência real. Recusas de escrita, quando presentes, são esperadas em read-only. | 12 eventos; 8b8588a42823; resultado/erro e Git retidos |
| 599a83d2-20b1-4a1c-9a45-f7eb83a5e79c | FAILED | HTTP500 simulado: falha esperada de infraestrutura; retries limitados e estado terminal coerente. Não é defeito produtivo do modelo. | 3 eventos; 9ea5a2954c85; seção Git ausente |
| 5a3b4878-6545-4306-813f-b04c3e161d6f | FAILED | Runner/heartbeat inválido simulado; reconciliação para FAILED era o resultado esperado, sem sucesso fictício. | 0 eventos; d83938f49de7; timeline ausente |
| 5bb97f13-56c8-4760-afd6-25f12585f655 | FAILED | HTTP500 simulado: falha esperada de infraestrutura; retries limitados e estado terminal coerente. Não é defeito produtivo do modelo. | 3 eventos; 6a8138fd61b3; seção Git ausente |
| 5ca318be-78ee-4e6f-8306-40f6bef8a904 | FAILED | HTTP500 simulado: falha esperada de infraestrutura; retries limitados e estado terminal coerente. Não é defeito produtivo do modelo. | 3 eventos; 7e281a8aa24f; seção Git ausente |
| 6223748e-150d-4a16-a664-a590fe4fbf1e | COMPLETED | Fixture de leitura com modelo simulado; resultado/Git persistidos, não comprova inferência real. Recusas de escrita, quando presentes, são esperadas em read-only. | 0 eventos; 83862dac0458; timeline ausente, seção Git ausente |
| 63c0ef6e-2d18-4afa-a615-c7a58166fae1 | FAILED | HTTP500 simulado: falha esperada de infraestrutura; retries limitados e estado terminal coerente. Não é defeito produtivo do modelo. | 3 eventos; 4586b6a118aa; seção Git ausente |
| 687f429d-c09c-47ee-9812-3d61efa52f04 | FAILED | HTTP500 simulado: falha esperada de infraestrutura; retries limitados e estado terminal coerente. Não é defeito produtivo do modelo. | 4 eventos; 510e74045743; seção Git ausente |
| 68986e7e-d764-42d3-b791-9efc79a17c81 | COMPLETED | Fixture de leitura com modelo simulado; resultado/Git persistidos, não comprova inferência real. Recusas de escrita, quando presentes, são esperadas em read-only. | 8 eventos; 2657589ae821; resultado/erro e Git retidos |
| 6b5ba12b-a2ba-4b52-846e-15a81b8efe41 | FAILED | HTTP500 simulado: falha esperada de infraestrutura; retries limitados e estado terminal coerente. Não é defeito produtivo do modelo. | 3 eventos; e34dbea68580; seção Git ausente |
| 71135d8f-a644-419c-8fe9-a93ffad3f3c4 | COMPLETED | Fixture de leitura com modelo simulado; resultado/Git persistidos, não comprova inferência real. Recusas de escrita, quando presentes, são esperadas em read-only. | 8 eventos; a86181070871; resultado/erro e Git retidos |
| 74e99878-68c1-475a-843c-ffd492f13bce | FAILED | Runner/heartbeat inválido simulado; reconciliação para FAILED era o resultado esperado, sem sucesso fictício. | 0 eventos; 0ef1bb460afb; timeline ausente |
| 7ab04af1-cf97-4461-8435-6eeebfa5d9f4 | COMPLETED | Fixture de leitura com modelo simulado; resultado/Git persistidos, não comprova inferência real. Recusas de escrita, quando presentes, são esperadas em read-only. | 12 eventos; 8e13e1c0db48; resultado/erro e Git retidos |
| 7b851202-04d4-4333-8069-db30250aef5a | COMPLETED | Fixture de leitura com modelo simulado; resultado/Git persistidos, não comprova inferência real. Recusas de escrita, quando presentes, são esperadas em read-only. | 0 eventos; 46b984d65530; timeline ausente, seção Git ausente |
| 7c83c3c8-a830-419b-8beb-2703aed5ec4f | COMPLETED | Fixture de leitura com modelo simulado; resultado/Git persistidos, não comprova inferência real. Recusas de escrita, quando presentes, são esperadas em read-only. | 8 eventos; f054c0513164; resultado/erro e Git retidos |
| 7e3c3d98-d1b0-4046-b3de-3372a4620f36 | FAILED | HTTP500 simulado: falha esperada de infraestrutura; retries limitados e estado terminal coerente. Não é defeito produtivo do modelo. | 4 eventos; ed927b256e0f; seção Git ausente |
| 7e83cf71-5f9d-4e12-8428-bed49e075076 | FAILED | HTTP500 simulado: falha esperada de infraestrutura; retries limitados e estado terminal coerente. Não é defeito produtivo do modelo. | 4 eventos; a33f402ffa9b; seção Git ausente |
| 801027ea-70e0-4c42-bd0b-06215900fcd6 | FAILED | HTTP500 simulado: falha esperada de infraestrutura; retries limitados e estado terminal coerente. Não é defeito produtivo do modelo. | 4 eventos; c1f3e82e418b; seção Git ausente |
| 82a2b2e1-e968-47bc-8384-4699fa5515a8 | FAILED | HTTP500 simulado: falha esperada de infraestrutura; retries limitados e estado terminal coerente. Não é defeito produtivo do modelo. | 0 eventos; 4feb5477c1b9; timeline ausente, seção Git ausente |
| 85319e53-7d8a-4f17-8e4b-48a3913e503b | FAILED | HTTP500 simulado: falha esperada de infraestrutura; retries limitados e estado terminal coerente. Não é defeito produtivo do modelo. | 3 eventos; e8ea3fb50ae9; seção Git ausente |
| 8a6463c6-8490-4853-8471-121fa704c7d6 | FAILED | HTTP500 simulado: falha esperada de infraestrutura; retries limitados e estado terminal coerente. Não é defeito produtivo do modelo. | 3 eventos; 9fd255362454; seção Git ausente |
| 8d167601-fc48-4176-818f-8c8ad5d39168 | FAILED | HTTP500 simulado: falha esperada de infraestrutura; retries limitados e estado terminal coerente. Não é defeito produtivo do modelo. | 3 eventos; d75f3641fc54; seção Git ausente |
| 92771c9b-c901-45ee-9369-dbb33ca44351 | FAILED | HTTP500 simulado: falha esperada de infraestrutura; retries limitados e estado terminal coerente. Não é defeito produtivo do modelo. | 4 eventos; 838f45334975; seção Git ausente |
| 955931d8-3f2f-498d-84e5-a4cfe081ba0a | COMPLETED | Fixture de leitura com modelo simulado; resultado/Git persistidos, não comprova inferência real. Recusas de escrita, quando presentes, são esperadas em read-only. | 8 eventos; b9191b10e9de; resultado/erro e Git retidos |
| 996a0ac0-8a2f-4a2f-adcf-bb96b4498a91 | FAILED | HTTP500 simulado: falha esperada de infraestrutura; retries limitados e estado terminal coerente. Não é defeito produtivo do modelo. | 3 eventos; f77943b21700; seção Git ausente |
| 9a423410-d0ce-4cf6-9f7d-2b5198fd03f2 | FAILED | HTTP500 simulado: falha esperada de infraestrutura; retries limitados e estado terminal coerente. Não é defeito produtivo do modelo. | 4 eventos; 12d544aaf905; seção Git ausente |
| 9c81ff58-61d4-4751-8275-21f52358a428 | COMPLETED | Fixture de leitura com modelo simulado; resultado/Git persistidos, não comprova inferência real. Recusas de escrita, quando presentes, são esperadas em read-only. | 12 eventos; f0120e4ea858; resultado/erro e Git retidos |
| 9f85b11e-fe74-4ecc-a72f-f8028739a237 | FAILED | HTTP500 simulado: falha esperada de infraestrutura; retries limitados e estado terminal coerente. Não é defeito produtivo do modelo. | 4 eventos; d18a58f21010; seção Git ausente |
| a405ec96-3062-4156-b910-1167f7c3c405 | FAILED | HTTP500 simulado: falha esperada de infraestrutura; retries limitados e estado terminal coerente. Não é defeito produtivo do modelo. | 3 eventos; c1e2561ffbdb; seção Git ausente |
| a90944cf-45f2-4e8f-b3b1-8d76762bb040 | COMPLETED | Fixture de leitura com modelo simulado; resultado/Git persistidos, não comprova inferência real. Recusas de escrita, quando presentes, são esperadas em read-only. | 10 eventos; 5e0c94f8951b; resultado/erro e Git retidos |
| ad5523e3-416b-447d-958c-e8a5b9564571 | COMPLETED | Fixture de leitura com modelo simulado; resultado/Git persistidos, não comprova inferência real. Recusas de escrita, quando presentes, são esperadas em read-only. | 12 eventos; 8761224fe2ef; resultado/erro e Git retidos |
| aee9087e-bf43-440f-acac-379567057611 | FAILED | HTTP500 simulado: falha esperada de infraestrutura; retries limitados e estado terminal coerente. Não é defeito produtivo do modelo. | 3 eventos; 33ad6ebab5c8; seção Git ausente |
| b05bfefd-f227-4e48-b902-82bcd3713e5d | COMPLETED | Fixture de leitura com modelo simulado; resultado/Git persistidos, não comprova inferência real. Recusas de escrita, quando presentes, são esperadas em read-only. | 12 eventos; 041bcb5446f9; resultado/erro e Git retidos |
| b57439ef-d040-4f01-9d2f-d5e6e277d13d | COMPLETED | Fixture de leitura com modelo simulado; resultado/Git persistidos, não comprova inferência real. Recusas de escrita, quando presentes, são esperadas em read-only. | 8 eventos; 2513658cd912; resultado/erro e Git retidos |
| b61c5e99-409f-4e25-94c4-3c7e83d0927b | COMPLETED | Fixture de leitura com modelo simulado; resultado/Git persistidos, não comprova inferência real. Recusas de escrita, quando presentes, são esperadas em read-only. | 12 eventos; fccc1ce3bcef; resultado/erro e Git retidos |
| b9ab2290-8707-4404-90d5-bb395e5bc30e | COMPLETED | Fixture de leitura com modelo simulado; resultado/Git persistidos, não comprova inferência real. Recusas de escrita, quando presentes, são esperadas em read-only. | 12 eventos; 45f4088deed3; resultado/erro e Git retidos |
| bd486d4c-1211-490d-98ef-22b04dac6059 | FAILED | HTTP500 simulado: falha esperada de infraestrutura; retries limitados e estado terminal coerente. Não é defeito produtivo do modelo. | 3 eventos; 7c972afb68f0; seção Git ausente |
| bf3252e1-c894-4774-b8ad-d5297eb8b6bb | COMPLETED | Fixture de leitura com modelo simulado; resultado/Git persistidos, não comprova inferência real. Recusas de escrita, quando presentes, são esperadas em read-only. | 12 eventos; fa7789fc3620; resultado/erro e Git retidos |
| c07e5f5b-2f0b-40ef-bed0-5af8abc5c8e6 | COMPLETED | Fixture de leitura com modelo simulado; resultado/Git persistidos, não comprova inferência real. Recusas de escrita, quando presentes, são esperadas em read-only. | 12 eventos; 500763523c0c; resultado/erro e Git retidos |
| c2da3188-1b80-4f9e-80ea-870029d0f5f5 | FAILED | HTTP500 simulado: falha esperada de infraestrutura; retries limitados e estado terminal coerente. Não é defeito produtivo do modelo. | 0 eventos; 1daa4ee6baca; timeline ausente, seção Git ausente |
| c96ef6d6-c427-423c-b85e-1dfdde679676 | FAILED | HTTP500 simulado: falha esperada de infraestrutura; retries limitados e estado terminal coerente. Não é defeito produtivo do modelo. | 4 eventos; b3e445ba3094; seção Git ausente |
| c9fdb1a8-1621-44ff-8529-5c6cac6fe9ca | COMPLETED | Fixture de leitura com modelo simulado; resultado/Git persistidos, não comprova inferência real. Recusas de escrita, quando presentes, são esperadas em read-only. | 0 eventos; e4536891de06; timeline ausente, seção Git ausente |
| cc8faeb3-ac75-4cfa-8e90-6549f50a9855 | COMPLETED | Fixture de leitura com modelo simulado; resultado/Git persistidos, não comprova inferência real. Recusas de escrita, quando presentes, são esperadas em read-only. | 10 eventos; 6135292784c4; resultado/erro e Git retidos |
| cd45eba1-230b-4b57-9ea3-fe4c52fbd4dc | FAILED | Runner/heartbeat inválido simulado; reconciliação para FAILED era o resultado esperado, sem sucesso fictício. | 0 eventos; 2796cc4498e2; timeline ausente |
| cf6c78c8-3004-41dd-87a6-ba0d809ba96e | FAILED | Runner/heartbeat inválido simulado; reconciliação para FAILED era o resultado esperado, sem sucesso fictício. | 0 eventos; 2aca3ed42b5d; timeline ausente |
| d03f9e4b-35e4-4d1a-9233-2ce194d45a2c | COMPLETED | Fixture de leitura com modelo simulado; resultado/Git persistidos, não comprova inferência real. Recusas de escrita, quando presentes, são esperadas em read-only. | 10 eventos; ce47dabc8509; resultado/erro e Git retidos |
| d18b6868-9dba-4279-bd9b-04d136f655d0 | COMPLETED | Fixture de leitura com modelo simulado; resultado/Git persistidos, não comprova inferência real. Recusas de escrita, quando presentes, são esperadas em read-only. | 12 eventos; 7f0d6b04bdc1; resultado/erro e Git retidos |
| d3fa395e-252e-479f-8d9e-c12c11c6c600 | FAILED | Runner/heartbeat inválido simulado; reconciliação para FAILED era o resultado esperado, sem sucesso fictício. | 0 eventos; ac18e94e0a72; timeline ausente |
| d476ff1e-f8e2-4b9f-abc1-4471042cca58 | FAILED | Runner/heartbeat inválido simulado; reconciliação para FAILED era o resultado esperado, sem sucesso fictício. | 0 eventos; a13477ccbfc0; timeline ausente |
| d5c642ef-10b9-4b77-b2e3-fa29ad1283b5 | FAILED | Runner/heartbeat inválido simulado; reconciliação para FAILED era o resultado esperado, sem sucesso fictício. | 0 eventos; ccb48f5efc18; timeline ausente |
| d7a33055-7b9c-4fb8-b2e9-efb572e172ec | FAILED | Falha de transporte ECONNREFUSED do servidor simulado após retries, não prova a variante HTTP500 desejada. Integração atual revalidada com mock vivo; artefato antigo preservado como evidência limitada. | 9 eventos; 21efb9fc06f2; seção Git ausente |
| d9f4b5c1-cee3-43a8-99f8-a55c25c586b6 | COMPLETED | Fixture de leitura com modelo simulado; resultado/Git persistidos, não comprova inferência real. Recusas de escrita, quando presentes, são esperadas em read-only. | 0 eventos; 9bad5dab1dc9; timeline ausente, seção Git ausente |
| da4ee65f-7856-4cf7-bc5b-0a886810da5f | COMPLETED | Fixture de leitura com modelo simulado; resultado/Git persistidos, não comprova inferência real. Recusas de escrita, quando presentes, são esperadas em read-only. | 0 eventos; fc89c7dd7b1d; timeline ausente, seção Git ausente |
| e0f35158-2865-4d81-b0bd-07a557c87a54 | FAILED | HTTP500 simulado: falha esperada de infraestrutura; retries limitados e estado terminal coerente. Não é defeito produtivo do modelo. | 0 eventos; 9fff64f279a4; timeline ausente, seção Git ausente |
| e4bdc80a-65fc-4493-98d6-d4ac445fec22 | FAILED | Runner/heartbeat inválido simulado; reconciliação para FAILED era o resultado esperado, sem sucesso fictício. | 0 eventos; 5f7f19b08bf2; timeline ausente |
| e9a1c3ba-96c9-47a2-8e76-fa8d7a5968d5 | FAILED | Runner/heartbeat inválido simulado; reconciliação para FAILED era o resultado esperado, sem sucesso fictício. | 0 eventos; 8a9102d05f94; timeline ausente |
| e9c18298-d075-4d43-9ad8-38c611ab1685 | COMPLETED | Fixture de leitura com modelo simulado; resultado/Git persistidos, não comprova inferência real. Recusas de escrita, quando presentes, são esperadas em read-only. | 10 eventos; 500d5989ea97; resultado/erro e Git retidos |
| ebb56ce8-dbaa-417e-b434-382240083605 | FAILED | HTTP500 simulado: falha esperada de infraestrutura; retries limitados e estado terminal coerente. Não é defeito produtivo do modelo. | 4 eventos; 3b12f9201329; seção Git ausente |
| ed8f336b-0f44-4d45-b71f-acea3dbe2b48 | FAILED | HTTP500 simulado: falha esperada de infraestrutura; retries limitados e estado terminal coerente. Não é defeito produtivo do modelo. | 3 eventos; 4b74814f5fc3; seção Git ausente |
| ef68edbf-d106-443d-87d0-85b11c772905 | FAILED | Runner/heartbeat inválido simulado; reconciliação para FAILED era o resultado esperado, sem sucesso fictício. | 0 eventos; 7006f79dc4e3; timeline ausente |
| f18b0e17-59c8-42bc-b76d-0cc46b547f33 | COMPLETED | Fixture de leitura com modelo simulado; resultado/Git persistidos, não comprova inferência real. Recusas de escrita, quando presentes, são esperadas em read-only. | 12 eventos; 0221a045c0d0; resultado/erro e Git retidos |
| f1fa2cd9-7a2d-49dc-bc7c-34b53d28d949 | FAILED | HTTP500 simulado: falha esperada de infraestrutura; retries limitados e estado terminal coerente. Não é defeito produtivo do modelo. | 0 eventos; 586df39ecf98; timeline ausente, seção Git ausente |
| f541b345-e8f4-4dd3-84c5-66d6022c5aa9 | COMPLETED | Fixture de leitura com modelo simulado; resultado/Git persistidos, não comprova inferência real. Recusas de escrita, quando presentes, são esperadas em read-only. | 8 eventos; a1ee8581bb1c; resultado/erro e Git retidos |
| f75f0e92-2058-4454-8e38-374f0bd7ee0d | COMPLETED | Fixture de leitura com modelo simulado; resultado/Git persistidos, não comprova inferência real. Recusas de escrita, quando presentes, são esperadas em read-only. | 8 eventos; af3aa7f94c5a; resultado/erro e Git retidos |
| f9089aeb-1ad4-4a18-8e59-691cd32597dc | FAILED | HTTP500 simulado: falha esperada de infraestrutura; retries limitados e estado terminal coerente. Não é defeito produtivo do modelo. | 4 eventos; ad7098a1790f; seção Git ausente |
| fa466d56-8255-4379-841b-d5ab7cd954bc | COMPLETED | Fixture de leitura com modelo simulado; resultado/Git persistidos, não comprova inferência real. Recusas de escrita, quando presentes, são esperadas em read-only. | 12 eventos; 937932465234; resultado/erro e Git retidos |
| fa843e53-f2b5-4190-aafa-70f57cee56cf | COMPLETED | Fixture de leitura com modelo simulado; resultado/Git persistidos, não comprova inferência real. Recusas de escrita, quando presentes, são esperadas em read-only. | 8 eventos; ad38c5cadc50; resultado/erro e Git retidos |
| fab0570c-5d97-47e8-b2a1-eb18a980cc6d | FAILED | HTTP500 simulado: falha esperada de infraestrutura; retries limitados e estado terminal coerente. Não é defeito produtivo do modelo. | 0 eventos; 51a5c4a51c66; timeline ausente, seção Git ausente |
| fb5c756f-7018-45dc-8002-d83a46339ac5 | FAILED | HTTP500 simulado: falha esperada de infraestrutura; retries limitados e estado terminal coerente. Não é defeito produtivo do modelo. | 0 eventos; 8dad13178712; timeline ausente, seção Git ausente |
| fc4d9614-a3b0-48a5-b83c-2ed248bd2d50 | COMPLETED | Fixture de leitura com modelo simulado; resultado/Git persistidos, não comprova inferência real. Recusas de escrita, quando presentes, são esperadas em read-only. | 0 eventos; 193c0110fcf8; timeline ausente |
| ff6d4e1e-8620-4806-abdf-09bf2c8a3e0f | COMPLETED | Fixture de leitura com modelo simulado; resultado/Git persistidos, não comprova inferência real. Recusas de escrita, quando presentes, são esperadas em read-only. | 8 eventos; d936a3696cf9; resultado/erro e Git retidos |
| ffafd1bd-c635-4969-8b4b-0cb3719d8dc8 | FAILED | Runner/heartbeat inválido simulado; reconciliação para FAILED era o resultado esperado, sem sucesso fictício. | 0 eventos; 66e6d816fc79; timeline ausente, seção Git ausente |
