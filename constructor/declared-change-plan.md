# F7P — prova de alteração nos alvos declarados

## Lacuna comprovada

O job `06e2c115` executou uma sequência determinística de criação de relatório, com exit0. O retorno declarou o relatório e páginas examinadas; a falha persistida informa `caminhos inalterados: nenhum` e `Git sem mudança líquida: true`. O Worker não deveria repetir a aquisição ou a geração: o artefato foi preservado. Essa evidência não comprova qualidade/identidade bibliográfica do relatório.

No runtime atual, os alvos obrigatórios já são comparados por SHA256, mas comandos autorizados contam mutação somente por variação de Git e a guarda final exige Git diferente mesmo quando todos os alvos declarados mudaram. Assim, um relatório explicitamente exigido em path ignorado pelo Git é rejeitado apesar de sua alteração estar comprovada.

## Correção mínima, sem mudança normativa

O RCF exige alteração líquida e mudança em cada alvo declarado; Git não cobre arquivos ignorados. C=8/exclusivo do supervisor: a prova de conclusão afeta operações futuras. Estender a impressão de estado operacional com hashes dos alvos declarados para reconhecer mudança real em comandos e na guarda de progresso. Manter o estado Git separado e visível. Na conclusão, aceitar a prova por todos os alvos declarados mesmo sem variação Git; na ausência dessa lista/prova, manter a guarda Git existente.

Preservar integralmente autorização, fronteiras, leituras/comandos obrigatórios, falhas de validação, commit_policy, identidade/estado e exigência de efeito bem-sucedido. Arquivo idêntico, alteração revertida, alvo obrigatório faltante/inalterado ou efeito apenas em outro arquivo continuam insuficientes. Hash observado não comprova autoria ou aceite semântico; revisão do supervisor permanece.

## Validação

Testar runtime real por sequência determinística, somente fixtures exclusivas sob diretório já ignorado no alvo autorizado: relatório novo e alterado; escrita idêntica; alteração revertida; alvo faltante; outro arquivo; comando falho após efeito parcial; escrita ignorada não declarada. Conservar suíte atual de mudança rastreada/não rastreada e contratos de execução. Não alterar `.gitignore`, índice ou arquivos pessoais; conferir e restaurar estado Git inicial. Instalar pelo mecanismo existente, mantendo configurações/autorizações/recuperações. Commit e push por unidade mínima concluída.
