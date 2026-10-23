# E6T — recortes de evidência de auditoria

Ferramenta **interna deste construtor**, sem instalação, IO, rede ou inferência. Corrige a preparação de pacotes que retinha somente o início de erros: fontes longas ecoadas pelo Node ocultavam a exceção final. Implementação exclusiva do supervisor, C=8, pois recortes sustentam decisões de supervisão; não altera runtime, permissões, normas instaladas ou resultados históricos.

## Uso

Com Node22.21.0, importe `excerptAuditFieldE6T` de `./audit-evidence-excerpt.mts` em script `.mts` executado com `node --experimental-strip-types`. Passe o ID exato, campo `error` ou `result` e o texto **já capturado** correspondente. `bodyChars` e `gitChars` são limites configuráveis, respectivamente2400/600 caracteres por padrão; controles ficam no topo do módulo. O chamador conserva tarefas, contratos e requisitos integrais, a identidade/hash da captura e o limite total do pacote, segmentando-o quando necessário.

O retorno preserva início e fim, posições UTF-16 absolutas, intervalos omitidos, comprimento e SHA256 UTF-8 de cada seção e campo. O último marcador de início de linha `ESTADO GIT DETERMINÍSTICO (` separa um **candidato** a rodapé, com orçamento próprio, para que uma lista Git longa não oculte a exceção. A detecção textual não autentica esse rodapé. Não interpreta conteúdo, não filtra por risco nem expõe raciocínio privado.

`hasAuditQuoteE6T` confere uma citação literal em trecho visível do mesmo ID/campo, sem concatenar partes separadas por omissão. Use-o ao conferir citações; ele não demonstra causalidade, completude da captura, ausência de efeitos, autoria, qualidade ou verdade de uma paráfrase. Hash do campo capturado não comprova acesso ao arquivo original completo. Se a captura já estiver truncada, preserve essa limitação. O chamador não deve descartar silenciosamente eventos/requisitos para caber no orçamento.

## Validação de23/10/2026

`node --experimental-strip-types --test constructor/audit-evidence-excerpt.test.mts`: cinco testes passaram. Cobrem texto curto/vazio/Unicode, hashes e posições exatos, exceção depois de fonte longa e antes de rodapé Git grande, lacunas, isolamento de ID/campo, último marcador, chamadas independentes e limites inválidos.

Aplicação somente de leitura à captura congelada SHA256 `abd15bcf53429632b07c6d59158fa9bcc614c216378a29411a026256221fe676`: o campo de erro de7d6a26de possui8969 caracteres capturados; a saída reduzida preservou `SyntaxError: Unexpected string`. Não houve execução do script histórico, nova busca, inferência ou alteração no blog. O parecer anterior foi corrigido em `audit-review-2026-10-23.md`, sem nova delegação dos mesmos três casos.
