# SR-001 — Retomada do supervisor após restauração de uso

Pedido humano de 09/10/2026 nesta conversa: detectar saldo <=10%, agendar em resetsAt+60s, sobreviver ao supervisor/Worker/reboot, recuperar dependências e enviar somente `continue` ao chat original. Confirmar nova resposta real; envio/enfileiramento não é sucesso. Isolar conversa/ciclo, impedir duplicidade, persistir recuperação, diagnosticar impedimentos sem contornar autenticação/cota. Testar relógio, dependências, sessão, rede, envio, resposta e concorrência.

Escopo: componente opcional `supervisor/`, independente do Worker. Todas as fases de implementação/instalação/testes estão autorizadas pelo pedido. Não alterar modelo, esforço, permissões, autenticação nem FTs do repositório de teste. Nenhum autouso do Worker.

Unidades: SR-001A contrato/planejamento; SR-001B máquina de estados e testes; SR-001C adaptador Windows, instalação e validação real. Representação generalista em `src/supervisor/`, sincronizada pelo mecanismo existente. Configuração privada somente na instalação.

Evidências: CLI instalado oferece `app-server --stdio`, `account/rateLimits/read`, `thread/read`, `thread/turns/list` e `queue`. Consulta real sem inferência confirmou conta ChatGPT autenticada, janelas com usedPercent/resetsAt e identidade/cwd deste chat. Pacote Windows oferece AppUserModelID para inicialização. Automação nativa exige Desktop ativo; sozinha não cobre recuperação. Fonte: https://learn.chatgpt.com/docs/app-server e https://learn.chatgpt.com/docs/automations?surface=app .

Limitações a preservar: Windows não é tempo real; computador desligado, usuário sem logon, rede e login interativo impedem garantia temporal. `queue` não expõe chave idempotente nem recibo correlacionável garantido: envio ambíguo não pode repetir automaticamente. App-server separado lê estado persistido e pode mostrar turno ativo como interrompido; não usar isso para interromper trabalho. Resposta deve ser final, não vazia, em turno novo contendo `continue`, sem erro de runtime. Identidade ambígua exige diagnóstico, nunca sucesso.

Aceite por camadas: testes determinísticos de falhas e recuperação; telemetria/prontidão reais; disparo real de tarefa do SO; envio único/recepção/resposta verificados após o teste assíncrono. Testes simulados não comprovam restauração real da cota, reboot físico ou login expirado. Não forçar nenhum desses incidentes no computador em uso.
