# Regra local permanente — manutenção do localWorker

Esta regra aplica-se exclusivamente ao repositório que contém este arquivo, qualquer que seja seu caminho físico, em todas as conversas e execuções futuras associadas a ele. Antes de delegar qualquer tarefa daqui ao localWorker, leia esta regra.

- É proibido usar o próprio localWorker, direta ou indiretamente, para sua manutenção, correção, evolução, implementação, configuração ou integração. Isso inclui documentação de instalação e operação do próprio Worker quando sua redação ou correção constituir parte dessa manutenção.
- Todo trabalho para corrigir, modificar, implementar, configurar ou integrar o localWorker deve ser executado externamente a ele.
- O localWorker pode ser usado somente como instrumento de teste de uma solução já alterada definitivamente neste projeto ou em sua integração, na extensão necessária para validar essa alteração. O teste não pode pedir ao Worker que corrija, implemente ou modifique a si próprio.
- A preferência global por delegação ao Worker não derroga esta proibição específica deste repositório.
