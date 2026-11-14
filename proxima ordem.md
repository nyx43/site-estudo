# Próxima ordem — Estudo ES

Atualizado em 13/11/2026. A referência de longo prazo continua em [ordem de trabalho 26.2.md](ordem%20de%20trabalho%2026.2.md) e [docs/ROADMAP.md](docs/ROADMAP.md), prevalecendo as entregas já verificadas e as decisões registradas neste arquivo.

## Estado atual verificado

- **Período 26.2 (Nível 1) concluído e preservado (`d44f24a`):** as cinco matérias acadêmicas (*Complexidade de Algoritmos e Estrutura de Dados*, *Desenvolvimento de Softwares para Web*, *Engenharia de Requisitos de Softwares*, *Sistemas Operacionais* e *Gerenciamento de Banco de Dados*) seguem integradas ao catálogo e *APTA* permanece fora do escopo.
- **TTS por bloco concluído e preservado (`c5800f9`):** leitura local via Web Speech API integrada às aulas completas, estudo guiado, blocos de código e enunciados do laboratório.
- **Fase 2 concluída e endurecida (`f8aada3` e ajustes até `33859e9`):** laboratório Python real com sandbox `bubblewrap` fail-closed em `/laboratorio/python.lacos-de-repeticao`, cancelamento ativo, checagem de disponibilidade (`/api/lab/status`), escuta padrão em `127.0.0.1` e backup `VACUUM INTO` fora do repositório.
- **Fase 3 (Lote 1) concluída neste incremento (pendente de commit):** inspeção passiva dos 63 materiais acessíveis nas 5 pastas autorizadas de 26.2, suporte multi-linguagem (`PYTHON_SANDBOX`, `STATIC_CODE`, `CONCEPTUAL_ARTIFACT`), registro de 8 fontes verificadas e publicação em `AUTO_CHECKED` das **6 primeiras aulas completas do período 26.2** (mais 36 exercícios), preservando integralmente as 4 aulas de Python (e a v1 histórica de laços), o laboratório Python e os dados de `data/estudo.db`.

## O que foi entregue nesta fase (Fase 3 — Lote 1 de 26.2)

1. **Inspeção de fontes, rastreabilidade e cobertura (`docs/INVENTARIO_26_2.md`, `docs/COBERTURA_26_2.md`, `content/sources/*.json`):**
   - Inventário completo com metadados reais (páginas/slides/SHA-256/autores/conteúdo de ZIPs e varredura sem PII estudantil) dos 63 arquivos das 5 pastas autorizadas (`[26.2] APTA - DIREITOS HUMANOS` mantida intacta e não lida).
   - Desambiguação das apostilas duplicadas de Web, mapeamento do projeto Spring/MySQL `demo1.zip` em Banco de Dados e registro explícito da lacuna de apostila SQL/DDL relacional na pasta de BD 26.2.
   - Oito arquivos de fontes registrados em `content/sources/` (`algoritmos-26-2-slides`, `web-dev-26-2-slides`, `mdn-http-methods`, `requisitos-26-2-slides`, `sistemas-operacionais-26-2-slides`, `guia-foca-linux`, `banco-de-dados-26-2-spring`, `postgresql-ddl-constraints`).
2. **Suporte multi-linguagem e verificação estrutural (`src/lib/study/schema.ts`, `src/lib/study/verification.ts`, `src/components/study/lesson-article-reader.tsx`, `scripts/verify-examples.ts`, `tests/unit/verification.test.ts`):**
   - Campo opcional `exampleMode` (`PYTHON_SANDBOX` | `STATIC_CODE` | `CONCEPTUAL_ARTIFACT`) e `exampleLanguage` no `LessonSchema`, mantendo `PYTHON_SANDBOX` como padrão legado.
   - Adaptação dos textos introdutórios na leitura completa para não afirmar erroneamente que exemplos de HTTP, SQL, Requisitos ou Sistemas Operacionais são programas Python 3.
   - Separação clara em `npm run verify:examples`: exemplos `PYTHON_SANDBOX` continuam executados dentro da sandbox `bubblewrap` sem rede; artefatos `STATIC_CODE` e `CONCEPTUAL_ARTIFACT` passam por validação estrutural em `verifyNonPythonSeed` (JSON embutido inclusive truncado, delimitadores balanceados cientes de comentários SQL/C-style, ausência de `TODO`/`TBD`/`FIXME` e distinção nas revisões de IA).
3. **Seis aulas completas do Lote 1 de 26.2 em `AUTO_CHECKED` (`content/study/*.v1.json`, `docs/REVIEW_QUEUE.md`):**
   - `algoritmos.complexidade.v1` (`PYTHON_SANDBOX`) — Complexidade, contagem de operações, limites assintóticos `O`/`Ω`/`Θ` (separando limite assintótico de análise de pior/melhor caso), espaço de pilha vs. laço e `in list` vs. `set` (`6` exercícios).
   - `estruturas-de-dados.pilhas-e-filas.v1` (`PYTHON_SANDBOX`) — Pilhas LIFO, filas FIFO, custo de `pop(0)` O(n) vs. `collections.deque` O(1) e tratamento de estrutura vazia com `IndexError` intencional (`6` exercícios).
   - `web-dev.http-e-rest.v1` (`STATIC_CODE`, `"HTTP / JSON / REST"`) — Ciclo HTTP request-response, verbos safe/idempotentes (MDN), 401 vs. 403, contrato RESTful, enquadramento HTTP/1.1 e armadilha `200 OK { "success": false }` (`6` exercícios).
   - `requisitos.funcionais-e-nao-funcionais.v1` (`CONCEPTUAL_ARTIFACT`, `"Especificação de Requisitos / SRS IEEE"`) — Classificação RF/RNF, critérios IEEE (clareza, completude, consistência, testabilidade, rastreabilidade), estrutura SRS e revisão contra métricas/SLAs inventados por IA (`6` exercícios).
   - `sistemas-operacionais.modo-usuario-e-kernel.v1` (`CONCEPTUAL_ARTIFACT`, `"Arquitetura SO / Chamada de Sistema"`) — Fronteira usuário/kernel, drivers, endereçamento virtual, chamadas de sistema (syscall), kernel monolítico vs. microkernel e buffering de E/S (`6` exercícios).
   - `banco-de-dados.modelo-relacional.v1` (`STATIC_CODE`, `"SQL / Spring Data JPA"`) — Chaves primárias (`GENERATED ALWAYS AS IDENTITY` / `OVERRIDING SYSTEM VALUE`), estrangeiras (`ON DELETE RESTRICT` vs. `CASCADE`), `CHECK` e ponte com `@Entity`/`@Id`/`JpaRepository` de `demo1`, registrando de forma transparente a lacuna SQL de 26.2 (`6` exercícios).

## Limitações conhecidas e fila de revisão

- **Revisão humana pendente:** todas as 10 aulas atuais seguem em `AUTO_CHECKED`; a revisão pedagógica está listada em `docs/REVIEW_QUEUE.md`.
- **Lacuna de SQL relacional em BD (26.2):** os arquivos institucionais presentes em Gerenciamento de Banco de Dados cobrem Java OO e Spring Data JPA sem apostila DDL SQL; o tópico `banco-de-dados.modelo-relacional` foi suprido com a documentação oficial de constraints do PostgreSQL integrada aos exemplos Java/JPA do material `demo1` / `DW2-Modulo6`.
- **Expansão futura de laboratórios e backlog:** o laboratório interativo continua focado em `python.lacos-de-repeticao`; expansão para desafios Python em Complexidade/Estruturas de Dados e Lote 2 das disciplinas 26.2 ficam para os próximos incrementos.

## Verificações executadas neste incremento

- `npm run check` (`content:validate`, `lint`, `typecheck`, `test`, `test:db`, `build`), `npm run verify:examples` e `CHROMIUM_PATH=/opt/brave-bin/brave npm run test:e2e`: resultados consolidados em `docs/VALIDATION.md`.
- Backup prévio e migração/seed aditivo de `data/estudo.db`: `PRAGMA integrity_check = ok`, `foreign_key_check` com `0` erros (`Subject: 14`, `Module: 52`, `Topic: 121`, `Lesson: 11`, `Exercise: 80`), preservando as 4 aulas de Python (e v1 de laços), o laboratório e eventuais registros históricos.
- Inspeção no Chrome DevTools MCP (`http://127.0.0.1:3100`): `/aulas`, `/aulas/web-dev.http-e-rest` (desktop e móvel em tema escuro) e `/estudar/requisitos.funcionais-e-nao-funcionais` com `0` erros JS de console e respostas HTTP `200`.
- Revisão CodeRabbit CLI (`review --agent --uncommitted --include-untracked`): `6` apontamentos `minor` identificados, corrigidos e revalidados nos testes.

## Para outra conversa ou IA

Leia `AGENTS.md`, `README.md`, `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`, `docs/AUTHORING.md`, `docs/INVENTARIO_26_2.md`, `docs/COBERTURA_26_2.md` e este arquivo antes de editar. Preserve integralmente `data/estudo.db`, todas as 11 versões de aulas já armazenadas, os temas claro/escuro, o TTS por bloco e a sandbox `bubblewrap` fail-closed. Confira `git status` antes de editar e jamais leia nem incorpore arquivos de `[26.2] APTA - DIREITOS HUMANOS`.

## Comando pronto para copiar e colar para a próxima tarefa

```bash
cd -- "$(git rev-parse --show-toplevel)" &&
  python3 ferramentas/orq loop 'Leia AGENTS.md, README.md, docs/ARCHITECTURE.md, docs/ROADMAP.md, docs/AUTHORING.md, docs/INVENTARIO_26_2.md, docs/COBERTURA_26_2.md e "proxima ordem.md". Confira git status antes de alterar arquivos e preserve data/estudo.db, o catálogo 26.2, as 11 versões de aulas existentes, o TTS por bloco e a sandbox do laboratório Python. Sem tocar em APTA, produza o Lote 2 da Fase 3 (próximos tópicos planejados de Complexidade de Algoritmos, Estruturas de Dados, Desenvolvimento Web, Engenharia de Requisitos, Sistemas Operacionais e Banco de Dados a partir das fontes já inventariadas e, quando aplicável, documentação oficial), atualize docs/COBERTURA_26_2.md, docs/REVIEW_QUEUE.md, tests/unit/teaching.test.ts e os testes E2E, aplique seed aditivo em data/estudo.db após backup externo e execute npm run check, npm run verify:examples e CHROMIUM_PATH=/opt/brave-bin/brave npm run test:e2e, atualizando "proxima ordem.md" e docs/VALIDATION.md ao concluir.'
```
