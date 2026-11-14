# Próxima ordem — Estudo ES

Atualizado em 13/11/2026. A referência de longo prazo continua em [ordem de trabalho 26.2.md](ordem%20de%20trabalho%2026.2.md) e [docs/ROADMAP.md](docs/ROADMAP.md), prevalecendo as entregas já verificadas e as decisões registradas neste arquivo.

## Estado atual verificado

- **Período 26.2 (Nível 1) concluído e preservado (`d44f24a`):** as cinco matérias acadêmicas (*Complexidade de Algoritmos e Estrutura de Dados*, *Desenvolvimento de Softwares para Web*, *Engenharia de Requisitos de Softwares*, *Sistemas Operacionais* e *Gerenciamento de Banco de Dados*) seguem integradas ao catálogo e *APTA* permanece fora do escopo.
- **TTS por bloco concluído e preservado (`c5800f9`):** leitura local via Web Speech API integrada às aulas completas, estudo guiado, blocos de código e enunciados do laboratório.
- **Fase 2 concluída e endurecida (`f8aada3` e ajustes até `33859e9`):** laboratório Python real com sandbox `bubblewrap` fail-closed em `/laboratorio/python.lacos-de-repeticao`, cancelamento ativo, checagem de disponibilidade (`/api/lab/status`), escuta padrão em `127.0.0.1` e backup `VACUUM INTO` fora do repositório.
- **Fase 3 (Lote 1) registrada no commit `006f76a`:** inspeção passiva dos 63 materiais acessíveis nas 5 pastas autorizadas de 26.2, suporte multi-linguagem (`PYTHON_SANDBOX`, `STATIC_CODE`, `CONCEPTUAL_ARTIFACT`), registro de 8 fontes verificadas e publicação em `AUTO_CHECKED` das **6 primeiras aulas completas do período 26.2** (mais 36 exercícios), preservando integralmente as 4 aulas de Python (e a v1 histórica de laços), o laboratório Python e os dados de `data/estudo.db`.

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
- **Pilotos e backlog:** o laboratório interativo continua focado em `python.lacos-de-repeticao`. A próxima proposta é validar Fila Circular e Requisitos Testáveis. O Lote 2 permanece no backlog até a avaliação dos pilotos.

## Verificações executadas neste incremento

- `npm run check` (`content:validate`, `lint`, `typecheck`, `test`, `test:db`, `build`), `npm run verify:examples` e `CHROMIUM_PATH=/opt/brave-bin/brave npm run test:e2e`: resultados consolidados em `docs/VALIDATION.md`.
- Backup prévio e migração/seed aditivo de `data/estudo.db`: `PRAGMA integrity_check = ok`, `foreign_key_check` com `0` erros (`Subject: 14`, `Module: 52`, `Topic: 121`, `Lesson: 11`, `Exercise: 80`), preservando as 4 aulas de Python (e v1 de laços), o laboratório e eventuais registros históricos.
- Inspeção no Chrome DevTools MCP (`http://127.0.0.1:3100`): `/aulas`, `/aulas/web-dev.http-e-rest` (desktop e móvel em tema escuro) e `/estudar/requisitos.funcionais-e-nao-funcionais` com `0` erros JS de console e respostas HTTP `200`.
- Revisão CodeRabbit CLI (`review --agent --uncommitted --include-untracked`): `6` apontamentos `minor` identificados, corrigidos e revalidados nos testes.

## Para outra conversa ou IA

Leia `AGENTS.md`, `README.md`, `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`, `docs/AUTHORING.md`, `docs/INVENTARIO_26_2.md`, `docs/COBERTURA_26_2.md` e este arquivo antes de editar. Preserve integralmente `data/estudo.db`, todas as 11 versões de aulas já armazenadas, os temas claro/escuro, o TTS por bloco e a sandbox `bubblewrap` fail-closed. Confira `git status` antes de editar e jamais leia nem incorpore arquivos de `[26.2] APTA - DIREITOS HUMANOS`.

## Andamento dos pilotos — Etapas 1 a 3 concluídas e ativas localmente (14/11/2026)

- **Etapa 1 (Contratos, fontes e v2):** contratos `layerSections`, metadados de camada/escopo/objetivo/contexto/pré-requisitos, `hints`, `STRUCTURED_RESPONSE` e `OPEN_RESPONSE` sem chaves default nos JSONs v1; fonte oficial CPython `v3.12.16` `python-collections-deque`; aulas v2 **Fila Circular** (`estruturas-de-dados.pilhas-e-filas.v2`, `7` exercícios) e **Requisitos Testáveis** (`requisitos.funcionais-e-nao-funcionais.v2`, `8` exercícios) ativadas em `content/study/` com todas as `v1` preservadas (`status: "AUTO_CHECKED"`).
- **Etapa 2 (Avaliação, acesso C1–C3, retomada e UI):** `STRUCTURED_RESPONSE` com diagnóstico sem vazar gabarito; `OPEN_RESPONSE` registrando entrega para autoavaliação (`isCorrect = false`) sem atribuição de nota; regra compartilhada `canAccessExercise` liberando C1 direto pela leitura (sem `LessonProgress`, exigindo **Iniciar prática** em entrada por link) e desbloqueando C2/C3 após o percurso guiado da mesma versão sem exigir acerto em C1; troca de versões v1/v2 com detecção de retomada agrupada (`listAttemptedLessonIds`).
- **Etapa 3 (Migração 0005, dicas, autoavaliação, laboratório e estilos):**
  - Migração aditiva `db/migrations/0005_pilot-hints-self-assessment.sql` e rotas `POST /api/attempts/[id]/hints` e `PUT /api/attempts/[id]/self-assessment`.
  - Laboratório Python separado `content/labs/estruturas-fila-circular.json` (`4` testes de Fila Circular C2 em `bubblewrap`, resultados somente no navegador) e subtítulo generalizado em `src/components/lab/python-lab.tsx`.
  - Estilos claros/escuros e responsivos até `360px` em `src/app/globals.css`, além de ajustes em `study-workspace.tsx` (recarregamento imediato das permissões de exercícios ao concluir a 10ª etapa) e `exercise-panel.tsx` (`attempt.attemptsCount > 0` para entregas abertas).
- **Verificações comprovadas após as correções finais:**
  - `npm run check`: `content:validate` (`14` disciplinas, `52` módulos, `121` tópicos, `10` aulas atuais, `71` exercícios atuais, `13` versões preservadas, `2` laboratórios/`4` desafios), `eslint` (`0` avisos), `next typegen && tsc --noEmit` (`0` erros), `vitest run` (`11` arquivos, `91/91` aprovados), `npm run test:db` (`4` arquivos, `27/27` aprovados, incluindo upgrade sobre banco pré-0005) e `next build` concluído.
  - `npm run verify:examples`: `119` exemplos Python + `15` verificações de laboratório em `bwrap` + `64` artefatos estáticos/conceituais aprovados.
  - `CHROMIUM_PATH=/opt/brave-bin/brave npm run test:e2e`: `62/62` testes aprovados (desktop + mobile `360px`, incluindo `tests/e2e/pilots.spec.ts` e `settings.spec.ts`).
  - **Chrome DevTools MCP** (prévia isolada com cópia `/tmp/estudo-bkp-pilotos/restore-test.db`) e **CodeRabbit CLI** (`review --agent --uncommitted --include-untracked`): os `5` apontamentos nos arquivos dos pilotos foram corrigidos (`study-workspace.tsx`, `exercise-panel.tsx`, `schema.ts`, `evaluator.ts`, `study-handlers.ts`); o `1` apontamento de `src/app/api/configuracoes/ia/route.ts` permanece no escopo paralelo de Configurações sem alterações.
  - Banco pessoal `data/estudo.db` copiado com backup verificado em `/tmp/estudo-bkp-pilotos/estudo-backup-20261114-033908.db`, validado na cópia `/tmp/estudo-bkp-pilotos/restore-test.db` e migrado/populado aditivamente (`integrity_check = ok`, `0` erros de FK, `Lesson: 13`, `Exercise: 95`).
- **Pendências:**
  - Avaliação pedagógica humana das versões v2 em `docs/REVIEW_QUEUE.md` (status permanece `AUTO_CHECKED`).
  - Re-executar revisão CodeRabbit específica para `/configuracoes` quando o escopo paralelo for consolidado (`src/app/api/configuracoes/ia/route.ts` — CWE-290).
  - Não executar `git push`, publicação ou Lote 2 sem nova autorização explícita.

## Comando de retomada (pilotos v2 + verificação conjunta)

```bash
cd -- '/home/joaovt/Área de trabalho/site estudo/site-estudo-feat-plataforma-estudos' && git status --short && npm run check && npm run verify:examples && CHROMIUM_PATH=/opt/brave-bin/brave npm run test:e2e
```

## Configurações e prévias — 14/11/2026

- **Entregue:** `/configuracoes` com tema claro, escuro ou do sistema, tamanho do texto, largura e espaçamento de leitura, redução de movimento, voz e velocidade, leitura contínua, modo de leitura de código, restauração dos padrões e informações de privacidade.
- **IA opcional:** começa desligada. O cadastro local permite salvar, substituir e remover chaves de OpenAI, Anthropic e Google Gemini. O servidor guarda as chaves fora do Git, em arquivo com permissão restrita, e informa apenas quais provedores têm chave. A integração com provedores ainda está pendente. O trabalho de Configurações dispensou migração ou alterações nos exercícios dos pilotos.
- **Verificado em cópia isolada de `3a49206` com as alterações de Configurações:** `npm run check`; 34 percursos de navegador em desktop e celular (Configurações, tema, exercícios e laboratório); fluxo local da API com chave fictícia e rejeição de origem externa. A integração com o trabalho ainda em andamento nos pilotos fica para a validação conjunta.
- **Decisão pendente:** o usuário pode escolher entre Biblioteca (catálogo), Leitura (aula) e Prática (laboratório). Confira a prévia no chat antes de aplicar alterações de design. O arquivo de prévia está em `/home/joaovt/.codex/visualizations/2026/11/13/01a1d6ae-c6fa-7851-baa3-eb97ce2fdebb/alternativas-estudo-es.html`.
- **Comando após concluir os pilotos:** conferir o estado do checkout e validar Configurações junto com o trabalho do agy.

```bash
cd -- '/home/joaovt/Área de trabalho/site estudo/site-estudo-feat-plataforma-estudos' && git status --short && npm run check && CHROMIUM_PATH=/opt/brave-bin/brave npm run test:e2e -- tests/e2e/settings.spec.ts tests/e2e/theme.spec.ts tests/e2e/study.spec.ts tests/e2e/lab.spec.ts
```
