## Operação e verificação

O procedimento completo e atualizado está em [howto.md](../howto.md), especialmente nas etapas 3 a 7. Passe `repoPath` absoluto, tarefa completa e `thread_id` da conversa atual a `local_analyze`; confira identidade e diretório do chat. Use `read-only` por padrão. Após `RUNNING`, aguarde a entrega automática ao mesmo chat; ali consulte `local_result` uma vez e faça a revisão final.

Para testes, configure `TEST_REPO_PATH` com a cópia **limpa** de `jeancarloem.com.blog` e execute os três scripts indicados no guia principal. Não há caminho de máquina presumido.
