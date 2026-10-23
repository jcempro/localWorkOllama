# Auditoria supervisor ↔ Worker — captura de 2026-10-12 UTC

Cobertura: **197 jobs nao cancelados**, 88 operacionais e 109 fixtures, 61 identidades de conversa examinadas. Um CANCELLED excluido antes da leitura de seus demais artefatos. [Revisao individual](audit-report.md) e [manifesto de hashes](audit-manifest.json) preservam a evidencia da captura. Estados posteriores a ela nao sao retroativos.

Falhas de transporte/supervisao comprovadas: 10 jobs tiveram callback que terminou em usageLimitExceeded e a projeção original atribuiu chamadas local_result repetidas a 3 unidades. Essa atribuição antiga foi invalidada pela revisão A7R: menções históricas eram contadas como consultas. A recontagem congelada de 23/10 confirma apenas um candidato, 87fcc955, com duas leituras em conversas distintas; consulte audit-reconcile-2026-10-23.md. Os contadores de leitura da tabela abaixo são históricos e não devem fundamentar novos vereditos. A tabela separa tentativas de chamadas que realmente retornaram resultado terminal; chamada falha ou RUNNING nao equivale a resultado obtido. Os 102 callbacks nao encontrados marcados automaticamente sao fixtures, nao falhas de entrega operacional. Um recibo operacional estava corrompido; a recuperacao preservou bytes/hash e marcou AMBIGUOUS. Correlacao por ID distingue envio, recebimento, resposta e aceite; ausencia de historico nao permite inventar prova.

Gargalos: 19/23 unidades com sequencia deterministica chegaram a COMPLETED; mediana descritiva 25s (23 duracoes retidas). Inferencia agentiva: 20/65, mediana 455s (65 duracoes). Tarefas/hardware/carga nao foram controlados: isto nao e benchmark causal nem prova de que sequencias arbitrarias sao corretas. Ha 33 jobs retidos cuja falha registra ausencia de progresso; os alvos/efeitos parciais e continuacoes corretivas constam da revisao por ID.

Correcoes aplicadas: C11 sincroniza persistencia e recupera indice ativo pelos estados integros; recibo corrompido fica ambiguo com original preservado. C12 orienta adaptacao apos duas acoes improdutivas, preservando bloqueio apos quatro e limites de autoridade. C13 descobre CLI apos atualizacao do Desktop, recuperando as duas tarefas SR-001 que estavam bloqueadas por ENOENT. C14 preserva indice vazio compativel com MCP legado; C15 restaura conversa nao carregada com fila exata, sem reenvio. [Causas e prova de retomada](audit-causes.md) distinguem ensaio real de fixtures. C1–C10 continuam vigentes; testes funcionais falhos, caminhos inferidos, exportacoes inventadas e formatos de modulo incorretos exigem a revisao/segmentacao ja descritas.

Windows: Kernel-Power41 e EventLog6008 registraram reinicio inesperado no intervalo do desaparecimento de 0636b4d3. Isso explica a perda de processo e e consistente com arquivos zerados; nao identifica o gatilho fisico do reinicio nem autoriza atribui-lo ao Ollama. Persistencia sincronizada reduz o risco, sem prometer integridade absoluta de energia/hardware. Nenhum job antigo foi reiniciado para fabricar evidencia.

## Todas as interacoes retidas, por job

Contagem de local_result usa referencias diretas ao ID. Candidatos a callback exigem mensagem publica com a formula de retomada do runner; mencao manual isolada nao conta como callback. Para cada turno vinculado por ID, foram cruzadas todas as mensagens/ferramentas publicas, inclusive a resposta final sem repetir o ID. Resposta final e identificada pela fase oficial final/final_answer, sem inferir aceite semantico. Nao le reasoning/chain-of-thought. IDs de fixtures sem chat real continuam na tabela para cobertura integral. COMPLETED abaixo e estado do Worker, nao conclusao da FT. Recuperacao pendente/ambigua permanece explicita. A captura dos jobs e de 2026-10-12T01:26:14.921Z; a leitura do historico e de 2026-10-12T01:46:05.716Z.

| Job | Estado capturado | Entrega capturada | local_result tentativas / resultados terminais | Turnos publicos vinculados | Candidatos a callback | Avaliacao |
| --- | --- | --- | ---: | ---: | --- | --- |
| 041b84bc-8499-4085-8cf7-64bed3c3fc19 | FAILED | QUEUED_TO_CHAT | 1 / 1 | 3 | completed (resposta final) | Sem desvio de transporte comprovado |
| 05d99ac1-267b-496a-95b9-5f9875c78b28 | COMPLETED | QUEUED_TO_CHAT | 1 / 1 | 2 | failed:usageLimitExceeded (sem resposta final) | SUPERVISOR_QUOTA_FAILURE |
| 0636b4d3-dcf0-4f4f-89f3-68cb0f7bd169 | FAILED | AMBIGUOUS | 1 / 1 | 3 | sem callback retido | Sem desvio de transporte comprovado |
| 06b4db91-c629-4971-af57-53ad1a0a333e | FAILED | QUEUED_TO_CHAT | 1 / 1 | 3 | completed (resposta final) | Sem desvio de transporte comprovado |
| 07a35229-efab-416b-bf23-8c2645b81718 | COMPLETED | QUEUED_TO_CHAT | 1 / 1 | 2 | completed (resposta final) | Sem desvio de transporte comprovado |
| 0a5a6a2e-6fc2-4ea2-8f63-b4aa86b3408a | COMPLETED | QUEUED_TO_CHAT | 1 / 1 | 3 | completed (resposta final) | Sem desvio de transporte comprovado |
| 10ed293e-6362-43ad-9ea7-ad134e176cff | COMPLETED | QUEUED_TO_CHAT | 2 / 2 | 3 | completed (resposta final) | MULTIPLE_RESULT_READS |
| 167f9061-2b96-4a45-81a3-e2262572880d | COMPLETED | QUEUED_TO_CHAT | 1 / 1 | 2 | completed (resposta final) | Sem desvio de transporte comprovado |
| 177a3ead-0b73-4d7b-a38b-f9e21557fcc7 | FAILED | QUEUED_TO_CHAT | 1 / 1 | 3 | completed (resposta final) | Sem desvio de transporte comprovado |
| 18958922-a382-4b46-8d43-30265a4469de | COMPLETED | QUEUED_TO_CHAT | 1 / 1 | 2 | completed (resposta final) | Sem desvio de transporte comprovado |
| 1909cbd7-c886-452b-ab29-146c0936eae7 | COMPLETED | QUEUED_TO_CHAT | 1 / 1 | 4 | failed:usageLimitExceeded (sem resposta final) | SUPERVISOR_QUOTA_FAILURE |
| 1b270666-9d49-4b10-86d2-840f3b87530e | FAILED | QUEUED_TO_CHAT | 1 / 1 | 2 | completed (resposta final) | Sem desvio de transporte comprovado |
| 1b6422cf-7246-402a-831b-a04d74921f52 | FAILED | QUEUED_TO_CHAT | 1 / 1 | 3 | completed (resposta final) | Sem desvio de transporte comprovado |
| 21365a86-97f3-4745-8c62-85cf650677df | COMPLETED | QUEUED_TO_CHAT | 1 / 1 | 2 | completed (resposta final) | Sem desvio de transporte comprovado |
| 23dae47e-bc49-4c4b-9716-c247f96bfd7c | COMPLETED | QUEUED_TO_CHAT | 1 / 1 | 3 | completed (resposta final) | Sem desvio de transporte comprovado |
| 2464bdd0-1d79-4bc1-89bb-9610f9ac6dcd | FAILED | QUEUED_TO_CHAT | 1 / 1 | 3 | completed (resposta final) | Sem desvio de transporte comprovado |
| 2534f348-4461-46be-8531-4260576b006a | COMPLETED | QUEUED_TO_CHAT | 1 / 1 | 2 | failed:usageLimitExceeded (sem resposta final) | SUPERVISOR_QUOTA_FAILURE |
| 26c72128-8052-4f82-a366-4757468f437d | COMPLETED | QUEUED_TO_CHAT | 1 / 1 | 3 | completed (resposta final) | Sem desvio de transporte comprovado |
| 26cba7d7-e0dd-4e4e-8742-1bf631a6da41 | COMPLETED | QUEUED_TO_CHAT | 1 / 1 | 2 | completed (resposta final) | Sem desvio de transporte comprovado |
| 31315b9d-0fac-4837-83ac-49a2fad55bf1 | FAILED | QUEUED_TO_CHAT | 1 / 1 | 2 | completed (resposta final) | Sem desvio de transporte comprovado |
| 335dbab3-f591-4630-88dd-7b6288b1a48c | FAILED | QUEUED_TO_CHAT | 1 / 1 | 3 | completed (resposta final) | Sem desvio de transporte comprovado |
| 34f68910-7e3a-44e3-a3ec-88d0524d5d1f | FAILED | QUEUED_TO_CHAT | 1 / 1 | 3 | completed (resposta final) | Sem desvio de transporte comprovado |
| 3800f0d6-44e3-4bed-adac-3b4b83d6d206 | COMPLETED | QUEUED_TO_CHAT | 1 / 1 | 2 | completed (resposta final) | Sem desvio de transporte comprovado |
| 39a6be1a-3e89-4cad-b3ae-c507bfbcabb9 | COMPLETED | QUEUED_TO_CHAT | 1 / 1 | 3 | completed (resposta final) | Sem desvio de transporte comprovado |
| 3a1648f0-39c0-4fbf-8d50-21d4ae6169ea | COMPLETED | QUEUED_TO_CHAT | 1 / 1 | 2 | completed (resposta final) | Sem desvio de transporte comprovado |
| 3cef7c29-1090-4830-856d-5e30f4d7a06d | FAILED | QUEUED_TO_CHAT | 1 / 1 | 3 | completed (resposta final) | Sem desvio de transporte comprovado |
| 3fc8d540-0fe7-49d0-949b-ea4f10f3e9b4 | COMPLETED | QUEUED_TO_CHAT | 1 / 1 | 2 | completed (resposta final) | Sem desvio de transporte comprovado |
| 42d71676-c626-40aa-8002-93ebebc4ec87 | FAILED | QUEUED_TO_CHAT | 1 / 1 | 3 | completed (resposta final) | Sem desvio de transporte comprovado |
| 466f6512-c301-45ee-b75a-dee78657df4c | FAILED | QUEUED_TO_CHAT | 2 / 2 | 4 | completed (resposta final) | MULTIPLE_RESULT_READS |
| 46f217a3-9ffd-4bb3-876b-f7c6e48f1d4d | FAILED | QUEUED_TO_CHAT | 1 / 1 | 2 | completed (resposta final) | Sem desvio de transporte comprovado |
| 47087e3b-d3f1-4da4-8333-7541b9702d0e | COMPLETED | QUEUED_TO_CHAT | 1 / 1 | 2 | completed (resposta final) | Sem desvio de transporte comprovado |
| 48309641-c02b-4ba1-8a83-ac0138d67679 | FAILED | QUEUED_TO_CHAT | 1 / 1 | 3 | completed (resposta final) | Sem desvio de transporte comprovado |
| 492b9846-2e20-43e5-9d59-5339f27adc79 | COMPLETED | QUEUED_TO_CHAT | 1 / 1 | 2 | completed (resposta final) | Sem desvio de transporte comprovado |
| 4aa40afc-5647-4ea2-b88c-b6dab3d8c250 | FAILED | QUEUED_TO_CHAT | 1 / 1 | 2 | completed (resposta final) | Sem desvio de transporte comprovado |
| 54cf4c6f-79c3-4305-bf90-d57fffa86d0a | FAILED | QUEUED_TO_CHAT | 1 / 1 | 2 | completed (resposta final) | Sem desvio de transporte comprovado |
| 56c15176-0e1a-4393-b0b3-40af3822a841 | COMPLETED | QUEUED_TO_CHAT | 1 / 1 | 3 | failed:usageLimitExceeded (sem resposta final) | SUPERVISOR_QUOTA_FAILURE |
| 6744af56-d7cd-475e-8bb2-9dbbd40f2805 | COMPLETED | QUEUED_TO_CHAT | 1 / 1 | 3 | completed (resposta final) | Sem desvio de transporte comprovado |
| 69143910-7699-4fc5-a59a-be0460921ca4 | FAILED | QUEUED_TO_CHAT | 1 / 1 | 2 | completed (resposta final) | Sem desvio de transporte comprovado |
| 698aee2b-a18f-40a1-935a-1cd1fd118da8 | COMPLETED | QUEUED_TO_CHAT | 1 / 1 | 3 | completed (resposta final) | Sem desvio de transporte comprovado |
| 6a5017eb-e247-459f-a19f-1a43d5656a18 | COMPLETED | QUEUED_TO_CHAT | 1 / 1 | 3 | failed:usageLimitExceeded (sem resposta final) | SUPERVISOR_QUOTA_FAILURE |
| 6a5bd838-ef2e-4dc7-ad6d-5c640c15dfa2 | FAILED | QUEUED_TO_CHAT | 1 / 1 | 3 | completed (resposta final) | Sem desvio de transporte comprovado |
| 705cf4d3-8f02-4dbd-9d29-2a8afb92f669 | COMPLETED | QUEUED_TO_CHAT | 1 / 1 | 2 | completed (resposta final) | Sem desvio de transporte comprovado |
| 7be626fb-4b8a-4f4a-b693-f3847bdefe82 | COMPLETED | QUEUED_TO_CHAT | 1 / 1 | 2 | completed (resposta final) | Sem desvio de transporte comprovado |
| 7cd16c0c-23d1-4b8b-ba19-11ce38850105 | FAILED | QUEUED_TO_CHAT | 1 / 1 | 3 | completed (resposta final) | Sem desvio de transporte comprovado |
| 836c3ede-087c-40e6-bad7-d01467d2785f | FAILED | QUEUED_TO_CHAT | 1 / 1 | 3 | completed (resposta final) | Sem desvio de transporte comprovado |
| 83cbb4db-bcc2-4a75-845e-63d960bc41b3 | FAILED | QUEUED_TO_CHAT | 1 / 1 | 3 | completed (resposta final) | Sem desvio de transporte comprovado |
| 84ebdfbf-a3d5-453c-8f81-07aad8cc1cd9 | FAILED | QUEUED_TO_CHAT | 1 / 1 | 3 | completed (resposta final) | Sem desvio de transporte comprovado |
| 85c8d3a8-699e-4534-9107-9c481eb4298e | FAILED | QUEUED_TO_CHAT | 1 / 1 | 3 | interrupted (sem resposta final) | Sem desvio de transporte comprovado |
| 86ad1912-8f39-423d-924c-17cd7b892269 | FAILED | QUEUED_TO_CHAT | 1 / 1 | 2 | completed (resposta final) | Sem desvio de transporte comprovado |
| 87fcc955-0167-4f42-983f-9d5bbc60d7db | FAILED | QUEUED_TO_CHAT | 2 / 2 | 5 | failed:usageLimitExceeded (sem resposta final) | MULTIPLE_RESULT_READS |
| 88ae962c-9fc0-41a5-9bf0-dcc6797c6604 | COMPLETED | QUEUED_TO_CHAT | 1 / 1 | 2 | completed (resposta final) | Sem desvio de transporte comprovado |
| 92d264bc-ad30-4a94-9978-aa8715b2e760 | COMPLETED | TEST_SUPPRESSED | 0 / 0 | 1 | sem callback retido | Sem desvio de transporte comprovado |
| 93f4bffe-663c-40c6-b5c9-3723671039b3 | FAILED | QUEUED_TO_CHAT | 1 / 1 | 2 | completed (resposta final) | Sem desvio de transporte comprovado |
| 9479e1c3-40e9-4b46-8920-21098913eeb8 | FAILED | QUEUED_TO_CHAT | 1 / 1 | 2 | completed (resposta final) | Sem desvio de transporte comprovado |
| 99f89f39-da51-4085-8752-cac459ee1486 | FAILED | QUEUED_TO_CHAT | 1 / 1 | 3 | completed (resposta final) | Sem desvio de transporte comprovado |
| 9e62c36b-cbd7-498e-bcd2-92c154a41962 | COMPLETED | QUEUED_TO_CHAT | 1 / 1 | 3 | failed:usageLimitExceeded (sem resposta final) | SUPERVISOR_QUOTA_FAILURE |
| 9eeded63-3d66-424f-973e-843fe338e167 | FAILED | QUEUED_TO_CHAT | 1 / 1 | 2 | completed (resposta final) | Sem desvio de transporte comprovado |
| a6711cb4-7a4a-425f-b78e-6f25ec1c1d2d | FAILED | QUEUED_TO_CHAT | 1 / 1 | 2 | completed (resposta final) | Sem desvio de transporte comprovado |
| a85abf9a-36cc-46b0-9ea6-591512f7c716 | FAILED | QUEUED_TO_CHAT | 1 / 1 | 3 | completed (resposta final) | Sem desvio de transporte comprovado |
| a94c101d-861c-4217-9029-451296963c78 | COMPLETED | QUEUED_TO_CHAT | 1 / 1 | 3 | completed (resposta final) | Sem desvio de transporte comprovado |
| ab2ab50e-2917-4428-944c-a87dae966ce2 | COMPLETED | QUEUED_TO_CHAT | 1 / 1 | 3 | completed (resposta final) | Sem desvio de transporte comprovado |
| abe917cd-32c3-4925-94c1-cabd719411cc | COMPLETED | QUEUED_TO_CHAT | 1 / 1 | 2 | completed (resposta final) | Sem desvio de transporte comprovado |
| aeac491f-6da5-4b2b-9bee-9136afaee5eb | COMPLETED | QUEUED_TO_CHAT | 1 / 1 | 4 | failed:usageLimitExceeded (sem resposta final) | SUPERVISOR_QUOTA_FAILURE |
| b12224f2-98c7-4da2-898b-00c13b97d28d | COMPLETED | QUEUED_TO_CHAT | 1 / 1 | 2 | completed (resposta final) | Sem desvio de transporte comprovado |
| b5f0a09a-cb2a-4273-9549-5ec256957bfc | COMPLETED | QUEUED_TO_CHAT | 1 / 1 | 2 | completed (resposta final) | Sem desvio de transporte comprovado |
| c23fd8a5-f82d-4309-82af-76dcb0c4db84 | FAILED | QUEUED_TO_CHAT | 1 / 1 | 2 | completed (resposta final) | Sem desvio de transporte comprovado |
| c4ed101e-1ff3-4025-bb1c-ba15942dcab6 | COMPLETED | QUEUED_TO_CHAT | 1 / 1 | 2 | completed (resposta final) | Sem desvio de transporte comprovado |
| c62c960c-f7f1-43ef-96e0-c652db212c41 | COMPLETED | QUEUED_TO_CHAT | 1 / 1 | 2 | completed (resposta final) | Sem desvio de transporte comprovado |
| c675a003-11e9-437c-bbba-e71fdac0b5a9 | FAILED | QUEUED_TO_CHAT | 1 / 1 | 2 | completed (resposta final) | Sem desvio de transporte comprovado |
| c76f3c74-3d4c-4f47-ad06-b04c649de01f | FAILED | QUEUED_TO_CHAT | 1 / 1 | 3 | completed (resposta final) | Sem desvio de transporte comprovado |
| cca28055-65ea-489a-92a7-617d00019231 | FAILED | QUEUED_TO_CHAT | 1 / 1 | 3 | completed (resposta final) | Sem desvio de transporte comprovado |
| cdd74993-1172-4ddd-b731-7941e2422745 | FAILED | QUEUED_TO_CHAT | 1 / 1 | 2 | completed (resposta final) | Sem desvio de transporte comprovado |
| d3b56ec6-fca2-4dda-be83-5ae58d147366 | FAILED | QUEUED_TO_CHAT | 1 / 1 | 3 | failed:usageLimitExceeded (sem resposta final) | SUPERVISOR_QUOTA_FAILURE |
| d5fbcef2-3bc2-4646-96a9-b30dc520aa31 | COMPLETED | QUEUED_TO_CHAT | 1 / 1 | 2 | failed:usageLimitExceeded (sem resposta final) | SUPERVISOR_QUOTA_FAILURE |
| da2d215d-6a6b-442d-87ab-44187379e2a9 | COMPLETED | QUEUED_TO_CHAT | 1 / 1 | 2 | completed (resposta final) | Sem desvio de transporte comprovado |
| e0d22b19-c4a1-4fc6-94de-9ea4b822e151 | FAILED | QUEUED_TO_CHAT | 1 / 1 | 3 | completed (resposta final) | Sem desvio de transporte comprovado |
| e2491ebb-d3b1-4354-8d5b-48eaba4b63cd | FAILED | QUEUED_TO_CHAT | 1 / 1 | 2 | completed (resposta final) | Sem desvio de transporte comprovado |
| e52799f4-32ac-4904-a663-b464393fc70f | FAILED | QUEUED_TO_CHAT | 1 / 1 | 3 | completed (resposta final) | Sem desvio de transporte comprovado |
| e6cd3e35-ee34-4da5-af48-3ed7b53f5805 | FAILED | QUEUED_TO_CHAT | 1 / 1 | 2 | completed (resposta final) | Sem desvio de transporte comprovado |
| e790bc2a-5339-4404-a892-a99edeb91e98 | COMPLETED | QUEUED_TO_CHAT | 1 / 1 | 2 | completed (resposta final) | Sem desvio de transporte comprovado |
| ec0fa6fb-a827-43f2-ac39-169126d950db | FAILED | QUEUED_TO_CHAT | 1 / 1 | 3 | completed (resposta final) | Sem desvio de transporte comprovado |
| ee2343ff-daf0-4c43-9cff-6de89e6bf546 | FAILED | QUEUED_TO_CHAT | 1 / 1 | 3 | completed (resposta final) | Sem desvio de transporte comprovado |
| ef363c09-0d86-4058-9b06-a3e0680210aa | FAILED | QUEUED_TO_CHAT | 1 / 1 | 3 | completed (resposta final) | Sem desvio de transporte comprovado |
| efe47108-03f8-42f9-a73a-222092c524af | FAILED | QUEUED_TO_CHAT | 1 / 1 | 2 | completed (resposta final) | Sem desvio de transporte comprovado |
| f02aebfe-b77d-4a48-a72e-fe7859e2f353 | FAILED | QUEUED_TO_CHAT | 1 / 1 | 2 | completed (resposta final) | Sem desvio de transporte comprovado |
| f5c61306-083c-4abe-a67b-a491ed20f7dc | FAILED | QUEUED_TO_CHAT | 1 / 1 | 3 | completed (resposta final) | Sem desvio de transporte comprovado |
| fa74c6a7-2147-43b0-aec8-95945467920b | COMPLETED | TEST_SUPPRESSED | 0 / 0 | 1 | sem callback retido | Sem desvio de transporte comprovado |
| fad92f07-e0c6-4b38-916c-de6f5f3def67 | FAILED | QUEUED_TO_CHAT | 1 / 1 | 3 | completed (resposta final) | Sem desvio de transporte comprovado |
| 002b83ae-69a7-4453-b343-1fc50fab59c4 | COMPLETED | QUEUED_TO_CHAT | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| 04ab7871-76c1-4301-a017-2ecf9a7646fe | FAILED | QUEUED_TO_CHAT | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| 0af7ddee-28db-4e8f-bbd8-954c35943b24 | FAILED | QUEUED_TO_CHAT | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| 0b283e75-79b6-43dc-ba28-3d4f893a2539 | FAILED | QUEUED_TO_CHAT | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| 0d61b004-418e-4089-b9fe-065792cae5a1 | COMPLETED | QUEUED_TO_CHAT | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| 1363af03-c110-4800-89f9-fbbb1cf5cf20 | FAILED | QUEUED_TO_CHAT | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| 13f47abd-6da3-45cc-9b23-7c1052b6ebb6 | FAILED | QUEUED_TO_CHAT | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| 14cf0bac-3a85-40de-b160-4182606c5ba2 | COMPLETED | QUEUED_TO_CHAT | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| 15b2cd13-177f-48a2-810f-97af5251fbd4 | FAILED | QUEUED_TO_CHAT | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| 1a12220b-a822-455e-94c7-0da19976e390 | FAILED | QUEUED_TO_CHAT | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| 1bd3bb82-0ae9-4073-adbd-e576d5763e15 | FAILED | QUEUED_TO_CHAT | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| 1d6e77f0-14a4-4352-9cbd-ac11b863f116 | COMPLETED | QUEUED_TO_CHAT | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| 2184719b-a8c0-41c0-9673-dc3e8a607e69 | FAILED | QUEUED_TO_CHAT | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| 2343898b-6108-4184-b88c-001b9de1ef55 | FAILED | DELIVERED | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| 29b4b6d7-b3c9-4ea8-ac4b-5080a02421cd | COMPLETED | QUEUED_TO_CHAT | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| 2be6d42a-4594-4cf6-a119-561c230a48a0 | FAILED | QUEUED_TO_CHAT | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| 2eab784f-2730-43f8-abd2-7fd5711e7de4 | FAILED | QUEUED_TO_CHAT | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| 30af16b1-7690-4931-8903-91943b7483d2 | COMPLETED | QUEUED_TO_CHAT | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| 32ef20d1-b3d1-4db5-86d0-b378afd3f7be | FAILED | QUEUED_TO_CHAT | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| 349dc012-d23c-482a-bbe3-7bffc93e9cef | COMPLETED | QUEUED_TO_CHAT | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| 34fb497a-6e10-4d22-9e49-2aedf46317a7 | COMPLETED | QUEUED_TO_CHAT | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| 36862cc4-ea4b-4b5e-a118-a17089320330 | FAILED | QUEUED_TO_CHAT | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| 37a1e203-3f16-40c3-bd71-40ba3cc66045 | FAILED | QUEUED_TO_CHAT | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| 37e18ef0-b31e-467f-86b9-67126c9ec25d | FAILED | QUEUED_TO_CHAT | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| 3a3835c7-0636-43fc-a7d1-90f8c55dbf79 | FAILED | QUEUED_TO_CHAT | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| 3d6d2c76-1dbf-4cd5-b36d-221f06bc2a05 | COMPLETED | QUEUED_TO_CHAT | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| 402c181d-c873-41d1-b62b-02918bf1e7ad | FAILED | QUEUED_TO_CHAT | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| 407f3146-13f9-406e-8d08-44a23fcacb03 | COMPLETED | DELIVERED | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| 43288595-d2ca-4c29-8497-16506036502d | FAILED | QUEUED_TO_CHAT | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| 45931965-836a-46f1-9048-92d284d91930 | COMPLETED | QUEUED_TO_CHAT | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| 46861072-d9f6-42d4-b33c-46795d9ecdc5 | FAILED | QUEUED_TO_CHAT | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| 4710b2d9-8c9b-47ed-9531-7e21d916bcf6 | COMPLETED | QUEUED_TO_CHAT | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| 4822eb0a-6332-41e8-a9f9-a1c650749128 | FAILED | QUEUED_TO_CHAT | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| 4b0b585a-cd01-41db-98e6-9180c9eded98 | COMPLETED | QUEUED_TO_CHAT | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| 5096dfd1-359d-4978-a1f8-1116360408f0 | FAILED | QUEUED_TO_CHAT | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| 521e66c6-adf0-4269-92c5-889c54ca2c81 | FAILED | QUEUED_TO_CHAT | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| 525841a8-acf6-4bbc-a660-1e5e66e954e6 | COMPLETED | QUEUED_TO_CHAT | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| 57c91356-ddf6-4b0e-81f5-29f84abb8a13 | COMPLETED | QUEUED_TO_CHAT | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| 599a83d2-20b1-4a1c-9a45-f7eb83a5e79c | FAILED | QUEUED_TO_CHAT | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| 5a3b4878-6545-4306-813f-b04c3e161d6f | FAILED | QUEUED_TO_CHAT | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| 5bb97f13-56c8-4760-afd6-25f12585f655 | FAILED | QUEUED_TO_CHAT | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| 5ca318be-78ee-4e6f-8306-40f6bef8a904 | FAILED | QUEUED_TO_CHAT | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| 6223748e-150d-4a16-a664-a590fe4fbf1e | COMPLETED | QUEUED_TO_CHAT | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| 63c0ef6e-2d18-4afa-a615-c7a58166fae1 | FAILED | QUEUED_TO_CHAT | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| 687f429d-c09c-47ee-9812-3d61efa52f04 | FAILED | QUEUED_TO_CHAT | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| 68986e7e-d764-42d3-b791-9efc79a17c81 | COMPLETED | QUEUED_TO_CHAT | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| 6b5ba12b-a2ba-4b52-846e-15a81b8efe41 | FAILED | QUEUED_TO_CHAT | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| 71135d8f-a644-419c-8fe9-a93ffad3f3c4 | COMPLETED | QUEUED_TO_CHAT | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| 74e99878-68c1-475a-843c-ffd492f13bce | FAILED | QUEUED_TO_CHAT | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| 7ab04af1-cf97-4461-8435-6eeebfa5d9f4 | COMPLETED | QUEUED_TO_CHAT | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| 7b851202-04d4-4333-8069-db30250aef5a | COMPLETED | DELIVERED | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| 7c83c3c8-a830-419b-8beb-2703aed5ec4f | COMPLETED | QUEUED_TO_CHAT | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| 7e3c3d98-d1b0-4046-b3de-3372a4620f36 | FAILED | QUEUED_TO_CHAT | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| 7e83cf71-5f9d-4e12-8428-bed49e075076 | FAILED | QUEUED_TO_CHAT | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| 801027ea-70e0-4c42-bd0b-06215900fcd6 | FAILED | QUEUED_TO_CHAT | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| 82a2b2e1-e968-47bc-8384-4699fa5515a8 | FAILED | QUEUED_TO_CHAT | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| 85319e53-7d8a-4f17-8e4b-48a3913e503b | FAILED | QUEUED_TO_CHAT | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| 8a6463c6-8490-4853-8471-121fa704c7d6 | FAILED | QUEUED_TO_CHAT | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| 8d167601-fc48-4176-818f-8c8ad5d39168 | FAILED | QUEUED_TO_CHAT | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| 92771c9b-c901-45ee-9369-dbb33ca44351 | FAILED | QUEUED_TO_CHAT | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| 955931d8-3f2f-498d-84e5-a4cfe081ba0a | COMPLETED | QUEUED_TO_CHAT | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| 996a0ac0-8a2f-4a2f-adcf-bb96b4498a91 | FAILED | QUEUED_TO_CHAT | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| 9a423410-d0ce-4cf6-9f7d-2b5198fd03f2 | FAILED | QUEUED_TO_CHAT | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| 9c81ff58-61d4-4751-8275-21f52358a428 | COMPLETED | QUEUED_TO_CHAT | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| 9f85b11e-fe74-4ecc-a72f-f8028739a237 | FAILED | QUEUED_TO_CHAT | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| a405ec96-3062-4156-b910-1167f7c3c405 | FAILED | QUEUED_TO_CHAT | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| a90944cf-45f2-4e8f-b3b1-8d76762bb040 | COMPLETED | QUEUED_TO_CHAT | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| ad5523e3-416b-447d-958c-e8a5b9564571 | COMPLETED | QUEUED_TO_CHAT | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| aee9087e-bf43-440f-acac-379567057611 | FAILED | QUEUED_TO_CHAT | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| b05bfefd-f227-4e48-b902-82bcd3713e5d | COMPLETED | QUEUED_TO_CHAT | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| b57439ef-d040-4f01-9d2f-d5e6e277d13d | COMPLETED | QUEUED_TO_CHAT | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| b61c5e99-409f-4e25-94c4-3c7e83d0927b | COMPLETED | QUEUED_TO_CHAT | 0 / 0 | 1 | sem callback retido | Fixture: nao exige conversa real |
| b9ab2290-8707-4404-90d5-bb395e5bc30e | COMPLETED | QUEUED_TO_CHAT | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| bd486d4c-1211-490d-98ef-22b04dac6059 | FAILED | QUEUED_TO_CHAT | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| bf3252e1-c894-4774-b8ad-d5297eb8b6bb | COMPLETED | QUEUED_TO_CHAT | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| c07e5f5b-2f0b-40ef-bed0-5af8abc5c8e6 | COMPLETED | QUEUED_TO_CHAT | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| c2da3188-1b80-4f9e-80ea-870029d0f5f5 | FAILED | DELIVERED | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| c96ef6d6-c427-423c-b85e-1dfdde679676 | FAILED | QUEUED_TO_CHAT | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| c9fdb1a8-1621-44ff-8529-5c6cac6fe9ca | COMPLETED | DELIVERED | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| cc8faeb3-ac75-4cfa-8e90-6549f50a9855 | COMPLETED | QUEUED_TO_CHAT | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| cd45eba1-230b-4b57-9ea3-fe4c52fbd4dc | FAILED | QUEUED_TO_CHAT | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| cf6c78c8-3004-41dd-87a6-ba0d809ba96e | FAILED | QUEUED_TO_CHAT | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| d03f9e4b-35e4-4d1a-9233-2ce194d45a2c | COMPLETED | QUEUED_TO_CHAT | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| d18b6868-9dba-4279-bd9b-04d136f655d0 | COMPLETED | QUEUED_TO_CHAT | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| d3fa395e-252e-479f-8d9e-c12c11c6c600 | FAILED | QUEUED_TO_CHAT | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| d476ff1e-f8e2-4b9f-abc1-4471042cca58 | FAILED | QUEUED_TO_CHAT | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| d5c642ef-10b9-4b77-b2e3-fa29ad1283b5 | FAILED | QUEUED_TO_CHAT | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| d7a33055-7b9c-4fb8-b2e9-efb572e172ec | FAILED | QUEUED_TO_CHAT | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| d9f4b5c1-cee3-43a8-99f8-a55c25c586b6 | COMPLETED | DELIVERED | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| da4ee65f-7856-4cf7-bc5b-0a886810da5f | COMPLETED | QUEUED_TO_CHAT | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| e0f35158-2865-4d81-b0bd-07a557c87a54 | FAILED | QUEUED_TO_CHAT | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| e4bdc80a-65fc-4493-98d6-d4ac445fec22 | FAILED | QUEUED_TO_CHAT | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| e9a1c3ba-96c9-47a2-8e76-fa8d7a5968d5 | FAILED | QUEUED_TO_CHAT | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| e9c18298-d075-4d43-9ad8-38c611ab1685 | COMPLETED | QUEUED_TO_CHAT | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| ebb56ce8-dbaa-417e-b434-382240083605 | FAILED | QUEUED_TO_CHAT | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| ed8f336b-0f44-4d45-b71f-acea3dbe2b48 | FAILED | QUEUED_TO_CHAT | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| ef68edbf-d106-443d-87d0-85b11c772905 | FAILED | QUEUED_TO_CHAT | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| f18b0e17-59c8-42bc-b76d-0cc46b547f33 | COMPLETED | QUEUED_TO_CHAT | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| f1fa2cd9-7a2d-49dc-bc7c-34b53d28d949 | FAILED | QUEUED_TO_CHAT | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| f541b345-e8f4-4dd3-84c5-66d6022c5aa9 | COMPLETED | QUEUED_TO_CHAT | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| f75f0e92-2058-4454-8e38-374f0bd7ee0d | COMPLETED | QUEUED_TO_CHAT | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| f9089aeb-1ad4-4a18-8e59-691cd32597dc | FAILED | QUEUED_TO_CHAT | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| fa466d56-8255-4379-841b-d5ab7cd954bc | COMPLETED | QUEUED_TO_CHAT | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| fa843e53-f2b5-4190-aafa-70f57cee56cf | COMPLETED | QUEUED_TO_CHAT | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| fab0570c-5d97-47e8-b2a1-eb18a980cc6d | FAILED | DELIVERED | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| fb5c756f-7018-45dc-8002-d83a46339ac5 | FAILED | QUEUED_TO_CHAT | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| fc4d9614-a3b0-48a5-b83c-2ed248bd2d50 | COMPLETED | QUEUED_TO_CHAT | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| ff6d4e1e-8620-4806-abdf-09bf2c8a3e0f | COMPLETED | QUEUED_TO_CHAT | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |
| ffafd1bd-c635-4969-8b4b-0cb3719d8dc8 | FAILED | QUEUED_TO_CHAT | 0 / 0 | 0 | sem callback retido | Fixture: nao exige conversa real |

## Chamadas que falharam antes de retornar job

Descoberta por chamadas reais ao servidor localworker inclui conversas sem job persistido, evitando omissao por inventario baseado somente em IDs. 15 chamadas publicas foram classificadas individualmente; validacao de entrada e revisao de aprovacao precedem o runtime. Resposta final humana aqui nao comprova implementacao. Causas iguais usam a mesma correcao, sem desligar guardas nem refazer tarefas de negocio.

| Conversa | Turno | Classe | Diagnostico verificavel | Resposta final retida | Tratamento |
| --- | --- | --- | --- | --- | --- |
| 01a11930-a51b-7051-af8d-cf47a7548f53 | 01a11b85-1f0b-7c70-b82d-26e49561edd4 | REQUEST_VALIDATION_ERROR | DESCRIPTION_TOO_LONG | sim | C9: description <=240, preservar validador |
| 01a11930-a51b-7051-af8d-cf47a7548f53 | 01a11be4-37e2-7802-bf09-a9e65ebad8a0 | SUPERVISOR_APPROVAL_REVIEW_LIMIT | QUOTA_REVIEW_NOT_EXECUTED | nao | C10/SR-001: aguardar cota; sem bypass |
| 01a11930-a51b-7051-af8d-cf47a7548f53 | 01a120d3-2c2d-7d00-86f5-87af718d6d45 | SUPERVISOR_APPROVAL_REVIEW_LIMIT | QUOTA_REVIEW_NOT_EXECUTED | nao | C10/SR-001: aguardar cota; sem bypass |
| 01a11930-a51b-7051-af8d-cf47a7548f53 | 01a12c7b-226a-75e1-82d1-91d9f21a6cda | WORKER_INFRA_ERROR | EMPTY_INDEX_LEGACY_MCP | sim | C14: indice vazio retrocompativel/ponte atualizada |
| 01a0e17a-3e03-70f1-a1fd-478197a5942b | 01a0e17a-511d-7ac2-be8a-33a36b9cd595 | WORKER_TRANSPORT_ERROR | LEGACY_SYNC_TIMEOUT | sim | C10: persistencia assincrona; sem teto temporal do job |
| 01a0f2c9-4ee2-71d1-852d-35e0407d4c68 | 01a0f2c9-5b53-72b2-a76f-262c464567c8 | WORKER_INFRA_ERROR | LEGACY_CYCLE_BUDGET | sim | C5: incompletude/segmentacao; teto configuravel |
| 01a0f34b-e5d0-7a21-9bdf-6afe37cb5f08 | 01a0f37b-cae0-7672-84a7-0b486b242dae | WORKER_TRANSPORT_ERROR | TRANSPORT_CLOSED | sim | C10: ponte instalada; reconciliar antes de nova unidade |
| 01a0f514-723d-7291-8a87-f0c8ec29c1aa | 01a0f7a8-1901-71c0-a9b5-2a6ae6d4e207 | REQUEST_VALIDATION_ERROR | ABSOLUTE_PROGRAM_REQUIRED | sim | C9: descobrir executavel real; preservar guarda |
| 01a0f7ae-5275-7891-8d18-412fd7d129fa | 01a0f7da-35cf-7ad0-9832-7adde71e968c | SUPERVISOR_APPROVAL_REVIEW_LIMIT | QUOTA_REVIEW_NOT_EXECUTED | nao | C10/SR-001: aguardar cota; sem bypass |
| 01a0f7ae-5275-7891-8d18-412fd7d129fa | 01a0f8c8-1f85-7350-abf1-a6f6895df862 | REQUEST_VALIDATION_ERROR | ABSOLUTE_PROGRAM_REQUIRED | sim | C9: descobrir executavel real; preservar guarda |
| 01a0fd51-9039-7391-be8c-ca7b469d10e8 | 01a0fd51-d5c8-7733-a38b-1671dcda4533 | REQUEST_VALIDATION_ERROR | ABSOLUTE_PROGRAM_REQUIRED | sim | C9: descobrir executavel real; preservar guarda |
| 01a0fde7-9402-7553-a648-9b4c16f911cf | 01a0fde7-a2a5-7ee3-8b48-693e9ad2f8ae | REQUEST_VALIDATION_ERROR | ABSOLUTE_PROGRAM_REQUIRED | sim | C9: descobrir executavel real; preservar guarda |
| 01a0ff41-d130-7572-a35f-4554d3d5d2fd | 01a0ff5c-0478-7c63-83b2-13a0838ea42f | REQUEST_VALIDATION_ERROR | ABSOLUTE_PROGRAM_REQUIRED | sim | C9: descobrir executavel real; preservar guarda |
| 01a12c51-f180-7c12-95dd-ade8bbc280d7 | 01a12c51-fae3-7d63-bc47-d17030182eee | WORKER_INFRA_ERROR | NUL_JSON | sim | C11: indice recuperado; origem comum a Markdown/TTS |
| 01a12c51-f180-7c12-95dd-ade8bbc280d7 | 01a12c64-864b-7c23-8384-36147e24737a | WORKER_INFRA_ERROR | NUL_JSON | sim | C11: indice recuperado; origem comum a Markdown/TTS |

## Reproducao

Capture jobs com audit-jobs.mjs, revise assessments e gere audit-report.md. Execute audit-interactions.mts com inventario, CODEX_HOME real e destino privado; depois render-interactions.mts com ambos os JSON e destino Markdown. Os argumentos sao paths absolutos ou relativos explicitos; dados brutos permanecem em audit-private/ ignorado no Git. Permissao SQLite/WAL exige execucao local autorizada. Falta de schema/historico interrompe com diagnostico, nao simula entrega. Ferramentas internas nao integram src nem o runtime consumidor.
