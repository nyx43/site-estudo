# Próxima ordem — Estudo ES

Atualizado em 13/11/2026. A referência de longo prazo continua em [ordem de trabalho 26.2.md](ordem%20de%20trabalho%2026.2.md) e [docs/ROADMAP.md](docs/ROADMAP.md), prevalecendo as entregas já verificadas e as decisões registradas neste arquivo.

## Estado atual verificado

- **Período 26.2 (Nível 1) concluído e preservado (`d44f24a`):** as cinco matérias acadêmicas (*Complexidade de Algoritmos e Estrutura de Dados*, *Desenvolvimento de Softwares para Web*, *Engenharia de Requisitos de Softwares*, *Sistemas Operacionais* e *Gerenciamento de Banco de Dados*) aparecem como **Em desenvolvimento**, *Python* segue **Pausada** com acesso integral preservado e *APTA* permanece fora do escopo.
- **TTS por bloco concluído e preservado (`c5800f9`):** leitura local via Web Speech API integrada às aulas completas, estudo guiado, blocos de código e agora também aos enunciados dos desafios no laboratório.
- **Fase 2 concluída e endurecida — Laboratório de programação Python real (`f8aada3` e ajustes `62fc40c`, `af9b4a4`, `7da477d`, `90a3445`, `1204316`, `3a51726`, `1dd54dc`, `2666796`, piloto em `python.lacos-de-repeticao`):** implementado de forma modular e orientada por dados (`content/labs/*.json`), preservando integralmente `data/estudo.db`, o catálogo 26.2, as quatro aulas existentes (incluindo v1 histórica de Laços de repetição) e os 44 exercícios.

## O que foi entregue nesta fase (Fase 2 — Laboratório Python real)

1. **Contratos, carregador orientado por dados e sanitização (`src/lib/lab/`, `src/lib/content/load-labs.ts`, `content/labs/python-lacos.json`):**
   - `LabDefinitionSchema`, `LabChallengeSchema`, `LabTestCaseSchema`, `LabRunRequestSchema` e constantes `LAB_LIMITS` em `src/lib/lab/schema.ts`.
   - `toPublicLab` e `normalizeLabOutput` em `src/lib/lab/public.ts` removendo sempre `referenceSolution` antes de enviar dados ao cliente/componentes públicos.
   - Helpers de rascunho local (`src/lib/lab/drafts.ts`) sob a chave `estudo-lab-drafts-v1`, com truncamento seguro por limites e até 64 entradas.
   - `loadLabs`, `loadLabByTopic` e `validateLabLinks` em `src/lib/content/load-labs.ts` acoplados ao `npm run content:validate`.
   - Piloto `content/labs/python-lacos.json` vinculado a `python.lacos-de-repeticao` com modo livre e 3 desafios (*1. Contagem regressiva*, *2. Soma dos números pares* e *3. Leitura até sentinela zero*), cada um com entrada simulada (`stdin`), 3 casos de teste e `referenceSolution` privada verificada automaticamente em `npm run verify:examples`.
2. **Sandbox isolada fail-closed e serviço/API (`src/lib/lab/sandbox.ts`, `src/lib/lab/service.ts`, `src/lib/http/lab-handlers.ts`, `src/app/api/lab/run/route.ts`):**
   - Execução via `bubblewrap` (`bwrap`) + `/usr/bin/python3 -I` com flags `--unshare-all`, `--unshare-user`, `--disable-userns`, `--assert-userns-disabled`, `--die-with-parent`, `--new-session`, `--cap-drop ALL`, `--clearenv`, montagem somente leitura de sistema, `/tmp` `tmpfs` limitado a 1 MB e `/sandbox` somente leitura (`0555`), sem expor checkout, `.env`, `data/estudo.db` nem diretório home do usuário.
   - Limites de kernel aplicados antes do handshake FD 3 (`"OK"`): `RLIMIT_AS` 128 MB, `RLIMIT_CPU` 2s, `RLIMIT_FSIZE` 64 KB, `RLIMIT_NOFILE` 32, `RLIMIT_NPROC` `(0, 0)` (bloqueia `fork` e criação de threads), timeout real de 2,5 s (`maxTimeoutMs` 5 s), captura limitada a 16 KB por fluxo (`stdout`/`stderr`) e encerramento forçado em estouro combinado (> 64 KB).
   - Comportamento **fail-closed**: se binários não existirem ou o handshake FD 3 `"OK"` falhar, lança `SandboxUnavailableError` (HTTP `503`) e **nunca** faz fallback para `python3` sem isolamento ou `eval`. Fila limita concorrência em 2 execuções simultâneas e 12 aguardando (`SandboxBusyError`, HTTP `429`), mantendo checagem obrigatória de `Origin` (CSRF 403), validação de `Host` contra allowlist de loopback (`127.0.0.1`, `localhost`, `[::1]`) contra DNS rebinding, limite de payload de 32 KB (413), endpoint leve `GET /api/lab/status` e abortamento ativo (`499 SANDBOX_ABORTED`) encerrando o grupo de processos (`-child.pid`) sem deixar órfãos; todo header de resposta usa `Cache-Control: private, no-store`.
   - Scripts de servidor (`dev`, `start`) escutam em `127.0.0.1` por padrão (com `dev:lan` / `start:lan` explícitos em `0.0.0.0` e risco documentado em `README.md`), backup consistente do SQLite via `VACUUM INTO` (`npm run db:backup` / `npm run db:backup:verify` fora do repositório via `ESTUDO_BACKUP_DIR`), favicon (`src/app/favicon.ico` + `src/app/icon.svg`) eliminando 404 de `/favicon.ico`, e backlog futuro documentado em `docs/ROADMAP.md` (`seccomp` e migração aditiva de rascunhos/selos do laboratório para SQLite, ainda não implementados).
3. **Interface acessível, cancelamento, disponibilidade e navegação orientada por dados:**
   - Componente `PythonLab` (`src/components/lab/python-lab.tsx`) e página `/laboratorio/[topicId]` (`src/app/laboratorio/[topicId]/page.tsx`) com abas entre desafios e Modo livre, indicador de linha/coluna e caracteres, salvamento automático de rascunho em `localStorage`, botão de restauração do código inicial, auto-indentação em `Enter`, atalho `Ctrl+Enter` / `Cmd+Enter`, modo opt-in `Tab = 4 espaços` (desativado por padrão e liberado com `Escape` para evitar armadilha de teclado WCAG), entrada simulada `stdin`, console de `stdout`/`stderr`/duração/código de saída, comparação detalhada dos testes automáticos, botão **Cancelar** (`AbortController`), verificação inicial via `GET /api/lab/status` desabilitando execução com explicação clara caso a sandbox esteja indisponível (mantendo edição e rascunhos funcionais), selo `"Passou nos testes automáticos"` e leitura em voz alta (TTS) integrada ao enunciado dos desafios.
   - Links automáticos para `/laboratorio/[topicId]` exibidos somente para tópicos com laboratório definido em `/aulas`, `/aulas/[topicId]`, `/estudar/[topicId]` e `/disciplinas/[slug]/[topic]`, estilizados para tema claro, escuro e viewport mobile de 360px em `src/app/globals.css`.

## Limitações e requisitos conhecidos da sandbox

- **Dependência de `bubblewrap` e namespaces de usuário sem privilégios:** o executor requer `/usr/bin/bwrap` e `/usr/bin/python3` funcionais no host Linux com criação de user namespaces liberada para o processo Node. Em contêineres restritos ou sistemas sem `bwrap`, a API retorna propositalmente HTTP `503` (`SANDBOX_UNAVAILABLE`) sem fallback inseguro.
- **Execução efêmera e sem escrita persistente:** não há suporte a bibliotecas externas fora da biblioteca padrão do Python 3 nem gravação em `/sandbox` (somente leitura); entradas interativas passo a passo ocorrem em lote via caixa `stdin`.
- **Rascunhos locais:** o código digitado no editor e o selo `"Passou nos testes automáticos"` (sem sugerir domínio) são salvos apenas no `localStorage` do navegador (`estudo-lab-drafts-v1`) para preservar integralmente as tabelas e o histórico de versões do banco SQLite.

## Verificações e testes executados

- **`npm run check`:**
  - `npm run content:validate`: 14 disciplinas, 52 módulos, 121 tópicos planejados; 4 aulas atuais, 32 exercícios atuais; 5 versões preservadas; **1 laboratório, 3 desafios validados** (`python.lacos-de-repeticao`).
  - `npm run lint`: 0 erros e 0 avisos (`eslint . --max-warnings=0`).
  - `npm run typecheck`: `next typegen && tsc --noEmit` sem erros.
  - `npm test`: **7 arquivos, 78 testes unitários e adversariais de sandbox passaram** (incluindo `tests/unit/lab.test.ts` e `tests/unit/lab-sandbox.test.ts`: checagem de `Origin`/DNS rebinding `Host`, `GET /api/lab/status` / `probeSandboxAvailability`, política explícita `SANDBOX_TESTS=skip`, cancelamento ativo + limpeza de PID/temporários e recuperação, isolamento real de rede/checkout/banco/`/home`, `RLIMIT_*`, timeout real e soluções de referência).
  - `npm run test:db`: **2 arquivos, 21 testes de integração SQLite passaram** (incluindo backup `VACUUM INTO`, bloqueio de destino/symlink dentro do repositório e teste de restauração em diretório temporário externo).
  - `npm run build`: compilação de produção Next.js 16.4.6 concluída com sucesso (incluindo `/laboratorio/[topicId]`, `/api/lab/run`, `/api/lab/status` e `/icon.svg`, sem avisos de tracing).
- **`npm run verify:examples`:** **81 exemplos/soluções e 10 verificações de laboratório confirmados em sandbox** sem rede ou acesso ao projeto (2 erros intencionais confirmados).
- **`CHROMIUM_PATH=/opt/brave-bin/brave npm run test:e2e`:** **52 percursos E2E passaram** (26 desktop + 26 mobile em banco isolado `.cache/e2e-*.db`), incluindo `/favicon.ico` (`200`) + `/icon.svg` (`200`), catálogo/leitura/estudo/tema/TTS e **12 fluxos independentes em `tests/e2e/lab.spec.ts`** (navegação aula → laboratório, Modo livre, `stdin`, `stderr` com `codigo.py`, persistência após reload + restauração, testes automáticos falhando e aprovando com selo `"Passou nos testes automáticos"`, TTS no enunciado, teclado sem armadilha de `Tab`, tema escuro, `360px` sem transbordamento horizontal, botão **Cancelar** em loop infinito com nova execução em seguida e simulação de sandbox indisponível via `/api/lab/status`).
- **`npm run db:backup` e `npm run db:backup:verify` (com `ESTUDO_BACKUP_DIR` temporário externo ao repositório):** backup consistente de `479232` bytes criado e restaurado em arquivo temporário externo com `PRAGMA integrity_check = ok`, `foreign_key_check` vazio e contagens idênticas (`Subject: 14`, `Module: 52`, `Topic: 121`, `Lesson: 5`, `Exercise: 44`), removido em seguida sem alterar `data/estudo.db`.
- **Integridade do banco pessoal (`data/estudo.db`):** `PRAGMA integrity_check = ok`, `PRAGMA foreign_key_check = []`, `Subject: 14`, `Module: 52`, `Topic: 121`, `Lesson: 5`, `Exercise: 44`, `LessonProgress: 0`, `Attempt: 0`, `Submission: 0`, preservado sem modificações.

## Pendências para a próxima fase

1. **Materiais do Google Drive (período 26.2):** os binários reais das cinco pastas ainda precisam ser disponibilizados/lidos localmente para completar localizadores exatos em `docs/INVENTARIO_26_2.md` e iniciar a produção da primeira fatia de aulas completas das cinco disciplinas de 26.2 (Fase 3), sem inventar fontes ou conteúdos.
2. **Expansão posterior dos laboratórios:** após avançar o conteúdo de 26.2 (ou em tópicos de programação como SQL/Web/Algoritmos), adicionar novas definições JSON em `content/labs/` conforme a arquitetura orientada por dados.

## Para outra conversa ou IA

Leia `AGENTS.md`, `README.md`, `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`, `docs/INVENTARIO_26_2.md` e este arquivo antes de editar. Preserve integralmente `data/estudo.db`, as aulas existentes, o tema claro/escuro, o sistema de TTS por bloco e a sandbox `bubblewrap` fail-closed do laboratório Python. Confira `git status` antes de editar e não invente localizadores de arquivos ainda inacessíveis.

## Comando pronto para copiar e colar para a próxima tarefa

```bash
cd -- "$(git rev-parse --show-toplevel)" &&
  python3 ferramentas/orq loop 'Leia AGENTS.md, README.md, docs/ARCHITECTURE.md, docs/ROADMAP.md, docs/INVENTARIO_26_2.md e "proxima ordem.md". Confira git status antes de alterar arquivos e preserve data/estudo.db, o catálogo 26.2, as aulas existentes, o TTS por bloco e a sandbox do laboratório Python. Avance para a leitura dos arquivos reais do período 26.2 que estiverem efetivamente acessíveis localmente (registrando exatamente quais acessos ainda faltarem, sem inventar conteúdo ou localizadores), complete os localizadores verificados em docs/INVENTARIO_26_2.md e produza o primeiro lote utilizável de aulas completas da Fase 3 para as disciplinas de 26.2 com fontes disponíveis, seguindo a profundidade e os critérios em docs/AUTHORING.md. Ao finalizar, execute npm run check, npm run verify:examples e CHROMIUM_PATH=/opt/brave-bin/brave npm run test:e2e, atualize "proxima ordem.md" com o que foi feito, testes, pendências e o próximo comando, e faça o commit das alterações.'
```
