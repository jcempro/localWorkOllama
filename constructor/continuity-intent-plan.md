# FT-CONTINUITY-U6C — soberania na retomada

Pedido humano de 15/10/2026: não retomar acompanhamento/conversas no início do SO, nem reabrir aplicativo encerrado voluntariamente; distinguir continuidade autorizada de encerramento/pausa e falha inesperada. A correção integral, instalação e testes estão autorizados pelo pedido. Mantém trabalhos históricos e capacidades compatíveis.

## Diagnóstico e decisão do supervisor

SR-001 registra logon + repetição e usa `Desktop` para abrir aplicativo ausente tanto no preparo quanto na confirmação. Eventos de quota sem obrigação pendente também geram `continue`. Entrega do Worker não vincula autorização à sessão/instância/turno: um callback tardio pode sobreviver à intenção original. Ausência de processo ou início do SO não demonstram falha involuntária. C=8: controles de autoridade/envio/ativação são corrigidos exclusivamente pelo supervisor, sem Worker na manutenção.

Contenção aplicada: sete tarefas SR-001 de propriedade comprovada foram desabilitadas; preservados estado, eventos, Worker e dados. Não é a solução definitiva.

## Unidades e aceite

1. Norma: prevalência da intenção, autorização vinculada à sessão/instância/turno e pausa conservadora; nenhuma restauração automática no boot. Atualizar RCF, extensão local e documentação distribuída.
2. Proteção comum de sessão; SR-001 sem lançamento automático do Desktop, sem logon/WakeToRun/catch-up de boot; Pause/Resume explícitos, eventos antigos suspensos, confirmação sem reenvio. Prontidão não abre aplicativo. Recuperação de dependências/erros transitórios continua dentro da autorização válida.
3. Callback Worker vinculado ao job, sessão/instância e turno originador; pausa por encerramento/boot/interrupção/substituição, sem cancelar inferência nem perder resultado. Retomada posterior somente explicitamente autorizada, nunca replay incerto.
4. Testes dirigidos: app fechado/reaberto, SO reiniciado, turno interrompido/novo, evento legado, pausa explícita, duplicidade, confirmação pendente e continuidade válida; espelhos, instalação e tarefas reais inspecionadas sem fechar o app do usuário nem forçar reboot.

Unidades 1–4 implementadas, testadas e instaladas; validação humana de uso/reboot permanece pendente, sem forçar incidentes no computador em uso. Cada unidade completa exige commit e push imediato. Não alegar distinção infalível entre crash e fechamento quando o runtime não fornece causa verificável; na incerteza pausar, preservar diagnóstico e exigir autorização. Não remover mensagens da fila nativa por SQL nem alterar dados de terceiros. Mensagens já aceitas pela plataforma têm limitação de revogação explícita. Auditoria ampliada de 264 jobs foi capturada privadamente; os 67 posteriores à captura anterior seguem em revisão, sem alegar aceite integral.
