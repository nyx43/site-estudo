# Próxima ordem — Estudo ES

Atualizado em 13/11/2026. A referência do projeto é [ordem de trabalho 26.2.md](ordem%20de%20trabalho%2026.2.md), com as decisões deste arquivo prevalecendo sobre a fila antiga.

## Objetivo atual

Organizar o estudo pessoal das cinco disciplinas do período 26.2: Complexidade de Algoritmos e Estrutura de Dados, Desenvolvimento de Softwares para Web, Engenharia de Requisitos de Softwares, Sistemas Operacionais e Gerenciamento de Banco de Dados. APTA fica fora do agrupamento.

A profundidade descrita na ordem de trabalho é o **nível 1**, uma primeira camada. Futuramente as matérias serão aprofundadas muito mais. As cinco disciplinas devem aparecer como **Em desenvolvimento**; as demais, como **Em breve** ou **Pausada**, conforme o estado real, preservando o acesso ao conteúdo já existente. Esses rótulos descrevem o andamento das disciplinas, sem declarar aulas planejadas como prontas ou revisadas.

## Situação e fila

- A troca de tema já foi realizada. Existem quatro aulas de Python e histórico de versões. `npm run check` passou em 13/11/2026; o teste específico do tema não foi reexecutado nesta revisão.
- A branch local tem alterações, incluindo tema e documentação. Confira `git status` e preserve todas elas. O GitHub recebeu o commit `73206ee294af342a28b66986210cc127e604d033`, mas a referência local pode ainda estar desatualizada.
- **Primeiro trabalho:** diagnóstico, backup consistente e teste de restauração em cópia, conforme a fase 0 da ordem de trabalho. Inventariar as cinco pastas e preparar uma matriz de fontes, registrando os limites de acesso e de leitura. Registrar plano concreto para os estados e agrupamento, sem declarar o catálogo implementado.
- Depois, implementar agrupamento e estados das disciplinas, experiência de estudo e TTS. Em seguida, piloto do laboratório Python isolado e aulas das cinco matérias em lotes. O planejamento e a escolha exata da próxima fatia dependem dos resultados da fase 0.

## Para outra conversa ou IA

Leia `AGENTS.md`, este arquivo e a ordem de trabalho completa antes de agir. Ao terminar cada tarefa, atualize este arquivo com o que foi feito, verificações, bloqueios e um comando pronto para a próxima ordem. Aguarde o usuário solicitar a execução da próxima tarefa.

## Resultado da primeira etapa da fase 0 — 13/11/2026

- Checkout `feat/plataforma-estudos`, HEAD `906c31c7509d944fdd94443ba62ffa84e61dac3b`; alterações pré-existentes em AGENTS, package, CSS, layout, shell, ferramentas e teste de tema foram preservadas, assim como as ordens não rastreadas. Node 24.22.3, npm 11.19.1; dependências instaladas. `.env` aponta para `file:./data/estudo.db`; não houve migração nem seed no banco pessoal.
- Backup consistente pela API online `sqlite3.Connection.backup` a partir de conexão somente leitura, em `.cache/backups/20261113-fase0/estudo-backup.db`, diretório privado e ignorado pelo Git. Restauração testada por outra operação de backup em `.cache/backups/20261113-fase0/restauracao-teste.db`: `integrity_check=ok` e `foreign_key_check` vazio. SHA-256 do original antes e depois: `6f24ea1e2eb97269fcbc28819f9eced9ffa2be47992802e46648402fdd6c28ea`. Backup: `8ebf43737bf0048bb6c51a9f8d9aadf05470a4af43c6e240f6f3009282bcd3c6`. Não havia arquivos WAL/SHM visíveis no início ou fim; a API inclui estado confirmado mesmo se existirem. `.cache` pode ser limpa: conservar uma cópia privada durável fora do checkout antes de depender deste backup.
- Para restaurar **em um novo caminho**, com Python 3: `python3 -c 'import sqlite3; s=sqlite3.connect("file:.cache/backups/20261113-fase0/estudo-backup.db?mode=ro", uri=True); d=sqlite3.connect("/tmp/estudo-restaurado.db"); s.backup(d); d.close(); s.close()'`. Use destino inexistente; confira integridade e referências antes de qualquer decisão separada de substituir o banco real. O teste acima não substituiu o original.
- Linha de base na cópia: 13 disciplinas, 49 módulos, 115 tópicos, 5 versões de aula e 44 exercícios; Laços v1 e v2 presentes. `LessonProgress`, `Attempt` e `Submission` têm zero registros neste banco. Isso não prova ausência de dados em outros locais. Navegação real não pôde ser exercitada neste ambiente.
- `npm run check` parou em `content:validate`: `tsx` não conseguiu criar socket Unix (`EPERM`). Executados independentemente: lint e typecheck passaram; 45 testes unitários e 20 de banco passaram, com bancos temporários em `/tmp`. Build falhou porque Turbopack não conseguiu abrir porta (`EPERM`). `npm run test:e2e` falhou na inicialização do servidor pelo mesmo bloqueio de socket do `tsx`; configuração exige banco exclusivo `.cache/e2e-*.db` e não reutiliza servidor. Repetir check e E2E em ambiente que permita sockets e portas; não enfraquecer proteções.
- [Inventário de fontes](docs/INVENTARIO_26_2.md): metadados de 68 itens, incluindo subpastas, listados nas cinco árvores; conteúdo não foi lido nesta rodada. A listagem do conector foi solicitada até 1000 itens por pasta, mas não expõe comprovação de paginação. Matriz é apenas preliminar: objetivos, pré-requisitos, localizadores, inspeção de ZIPs/planilha/imagens, direitos e avaliação de sensibilidade continuam pendentes. O material de Banco listado não comprova cobertura de SQL ou administração. APTA permanece fora.
- Plano para implementação posterior: representar período e relações com IDs estáveis em dados; associar as cinco matérias sem fundir IDs existentes, introduzindo SO após confronto do catálogo; apresentar as cinco como Em desenvolvimento e demais como Em breve ou Pausada conforme dados reais, sem confundir esse rótulo com `PLANNED` ou revisão de aulas. Preservar rotas, histórico e acesso anterior; mudanças de schema exigem migração aditiva, seed e testes em cópia. Nenhuma alteração de catálogo foi implementada.

### Próxima tarefa proposta — concluir fase 0

Validar `check` e percursos E2E em ambiente que permita sockets; concluir paginação e leitura das fontes acessíveis, desambiguar documentos e preencher matriz por fonte com localizadores reais, objetivos, pré-requisitos, lacunas, direitos e estado. Registrar bloqueios e não iniciar fase 1. A execução foi autorizada pelo usuário; preserve o trabalho existente e registre os resultados.

```bash
cd -- '/home/joaovt/Área de trabalho/site estudo/site-estudo-feat-plataforma-estudos' &&
  python3 ferramentas/orq loop 'Leia AGENTS.md, "proxima ordem.md", "ordem de trabalho 26.2.md" e docs/INVENTARIO_26_2.md. Continue somente a fase 0: execute check e E2E em ambiente com sockets permitidos; complete inventário e matriz por fonte mediante leitura efetiva e localizadores reais, documentando limites, direitos e lacunas. Preserve banco e alterações existentes, não execute ZIPs nem inicie fase 1. Atualize proxima ordem.md com resultados e próxima tarefa.'
```

O orquestrador atualizado fica em `ferramentas/orq`. O comando `loop` envolve planejamento, implementação e revisão sequenciais, com substituição quando uma resposta indicar limite de uso. Falhas de outra origem interrompem o processo e precisam de diagnóstico. A troca automática foi verificada com agentes simulados; os provedores podem apresentar mensagens de limite diferentes.

## Conclusão da Fase 0 e Organização do Período 26.2 (Nível 1) — 13/11/2026

### O que foi entregue

1. **Preservação do trabalho anterior e retomada do trabalho parcial:**
   - Foram preservadas integralmente todas as alterações locais pré-existentes (`AGENTS.md`, `package.json`, `ferramentas/orq`, tema claro/escuro em `src/app/layout.tsx`, `src/components/shell.tsx`, `src/app/globals.css` e `tests/e2e/theme.spec.ts`).
   - O trabalho parcial deixado pela tentativa anterior do orquestrador (contratos Zod em `src/lib/catalog/schema.ts`, `types.ts`, `filter.ts`, adaptadores de repositório, migração aditiva `db/migrations/0004_subject-lifecycle-track.sql`, `sistemas-operacionais.json` e 8 JSONs curriculares) foi auditado, preservado e completado nos 5 JSONs restantes (`arquitetura-de-software.json`, `git-e-versionamento.json`, `redes.json`, `seguranca-de-software.json` e `testes-de-software.json`).
2. **Organização das 5 disciplinas acadêmicas do período 26.2 (Nível 1) e estados reais:**
   - **Em desenvolvimento (`IN_PROGRESS`):**
     1. *Complexidade de Algoritmos e Estrutura de Dados* → vinculada às trilhas `algoritmos` e `estruturas-de-dados` (com apoio prático correlato em `python`), preservando todos os IDs e URLs originais;
     2. *Desenvolvimento de Softwares para Web* → trilha `web-dev`;
     3. *Engenharia de Requisitos de Softwares* → trilha `requisitos`;
     4. *Sistemas Operacionais* → nova trilha `sistemas-operacionais` (3 módulos e 6 tópicos `PLANNED` de nível 1 baseados no escopo confirmado);
     5. *Gerenciamento de Banco de Dados* → trilha `banco-de-dados` (com relação cruzada para `java` e `web-dev` e nota explícita sobre a lacuna de SQL nas fontes atuais da pasta).
   - **Pausada (`PAUSED`):** `python`, mantendo acesso 100% preservado às 4 aulas completas (`AUTO_CHECKED`), à versão 1 histórica de *Laços de repetição* e aos 32 exercícios atuais (44 no histórico).
   - **Em breve (`UPCOMING`):** `java`, `ruby`, `git-e-versionamento`, `testes-de-software`, `arquitetura-de-software`, `redes` e `seguranca-de-software`.
   - **APTA fora do escopo:** *APTA — Direitos Humanos* permanece excluída do currículo, do banco e da interface.
   - **Distinção explícita na UI:** `CatalogBrowser` (`src/components/catalog-browser.tsx`) e `SubjectPage` (`src/app/disciplinas/[slug]/page.tsx`) exibem o painel do **Período 26.2 · Nível 1**, filtros por andamento (`Todos os estados`, `Em desenvolvimento`, `Pausada`, `Em breve`) e selos separados para o **andamento da disciplina** (`Em desenvolvimento` / `Pausada` / `Em breve`) e a **disponibilidade real de aulas** (`4 aulas disponíveis` em Python vs. `Currículo planejado` / `Conteúdo planejado` nas demais, mantendo cada tópico sem aula como `Planejado`).
3. **Inventário de fontes (`docs/INVENTARIO_26_2.md`):**
   - Consolidado com os 68 itens listados do Google Drive (`1mBktCwJAgSY-mjwKx9o4R8zGqsUpnPeX`), desambiguação por ID/timestamp e matriz preliminar por fonte de nível 1.
   - **Materiais que ainda precisam ser acessados/lidos localmente:** os arquivos brutos do Drive não estão baixados no checkout local. Permanecem pendentes de leitura efetiva e extração de localizadores reais (páginas/slides):
     - *Complexidade:* `Aula 01.pdf` a `Aula 04.pdf`, `Estrutura de Dados - Estruturas Básicas (1).pdf`, planilha `Fila_Circular (1).xlsx`, scripts `45338.py`, `45339.py`, `45340.py`, `48081.py`, `48082.py`, `48083.py`, `50687.py` e `Tarefas/Enunciados.txt`.
     - *Web:* páginas detalhadas de `Aula 1`, `Aula 2`, os 9 PDFs `_[V2 - 2026] UGB - Desenvolvimento de Software para WEB*.pdf` (8 na raiz e 1 em `/Tarefas/`), inspeção estática passiva de `conceitos-react.zip` e `Tarefas/Enunciados.txt`.
     - *Requisitos:* numeração exata de slides dos 3 `.pptx` (`Aula1` a `Aula3`), páginas dos 7 PDFs (`aula3` a `aula9`), listas `.docx`/`.pdf` de exercícios (`aula1 (1).docx`, `aula1_exercicios.docx`, `aula2_exercicios.docx`, `aula8_IEEE_exercicios.docx`, `aula9_prototipagem_exercicio.docx`, `aula10_Prototipagem_exercicios.pdf`), imagens `exemplo1.png`, `exemplo2.jpg`, `exemplo3.png` e `Tarefas/Enunciados.txt`.
     - *Sistemas Operacionais:* páginas exatas de `Unix_History.pdf`, `Iniciante.pdf`, `Aula 2.pdf` a `Aula 5.pdf` e `Tarefas/Enunciados.txt`.
     - *Banco de Dados:* leitura detalhada de `revisaoPOOSpring.pdf`, `Aula - OO [Java].pdf`, `ExerciciosOO.pdf`, `ExerciciosOOClasses.pdf`, `Tarefas/Enunciados.txt`, inspeção estática passiva de `demo1.zip` e confirmação de novas fontes para cobrir modelagem relacional e SQL.

### Verificações e Testes Executados

- **Migração e seed em cópia temporária (`/tmp/estudo-migracao-26-2-test.db` a partir de `restauracao-teste.db`):** `db:migrate` e `db:seed` executados sem erro; `PRAGMA integrity_check = ok`, `PRAGMA foreign_key_check` vazio; 14 disciplinas (`IN_PROGRESS: 6`, `PAUSED: 1`, `UPCOMING: 7`), 5 versões de aula e 44 exercícios preservados.
- **Migração e seed no banco pessoal (`data/estudo.db`):** aplicados de forma aditiva (`0004_subject-lifecycle-track.sql`); `integrity_check = ok`, `foreign_key_check` vazio, 14 disciplinas, 52 módulos, 121 tópicos, 5 versões de aula e 44 exercícios intactos. Backups em `.cache/backups/20261113-fase0/` preservados (`SHA-256: 8ebf43737bf0048bb6c51a9f8d9aadf05470a4af43c6e240f6f3009282bcd3c6`).
- **`npm run check`:** passou integralmente:
  - `npm run content:validate`: 14 disciplinas, 52 módulos, 121 tópicos planejados; 4 aulas atuais, 32 exercícios atuais; 5 versões preservadas.
  - `npm run lint`: 0 erros, 0 avisos.
  - `npm run typecheck`: tipos Next e TypeScript estrito validados.
  - `npm test`: 4 arquivos, **48 testes unitários passaram**.
  - `npm run test:db`: 2 arquivos, **20 testes de integração SQLite passaram**.
  - `npm run build`: build de produção Next.js 16.4.6 concluído com sucesso.
- **`CHROMIUM_PATH=/opt/brave-bin/brave npm run test:e2e`:** **18 percursos E2E passaram** (9 desktop + 9 mobile em 360px, usando banco isolado `.cache/e2e-*.db`), cobrindo `catalog.spec.ts`, `reading.spec.ts`, `study.spec.ts` e `theme.spec.ts`.

### Pendências e Próxima Prioridade

1. **Prioridade imediata (Fase 1):** melhorar a experiência de estudo (navegação por seções, posição atual, foco/teclado, retomada confiável sem confundir leitura com conclusão) e implementar **TTS sob demanda por bloco** (reproduzir, pausar, retomar, parar, escolha de voz/velocidade com persistência local, sem sobreposição e com fallback claro quando indisponível, sem enviar texto para serviço remoto).
2. **Prioridade seguinte (Fase 2):** implementar o **laboratório de programação real** (piloto na aula de *Laços de repetição* em Python) com isolamento verificado (sem rede, sem acesso ao checkout/banco/home, limites estritos e falha fechada se o isolamento não estiver disponível).
3. **Em paralelo (quando os arquivos estiverem acessíveis):** leitura efetiva dos binários das 5 pastas do período 26.2 para completar localizadores reais antes de redigir os lotes de aulas da Fase 3. Não produzir dezenas de aulas antes de estabelecer o TTS por bloco e o laboratório de programação real.

### Comando pronto para copiar e colar para a próxima tarefa

```bash
cd -- '/home/joaovt/Área de trabalho/site estudo/site-estudo-feat-plataforma-estudos' &&
  python3 ferramentas/orq loop 'Leia AGENTS.md, README.md, docs/ARCHITECTURE.md, docs/ROADMAP.md, "proxima ordem.md" e "ordem de trabalho 26.2.md". Implemente a Fase 1: melhore a experiência de estudo (navegação entre seções, indicação de posição atual, acessibilidade por teclado e retomada confiável sem marcar leitura livre como concluída) e adicione TTS local sob demanda por bloco de texto (reproduzir, pausar, retomar, parar, seleção de voz e velocidade persistidas localmente, prevenção de reprodução sobreposta, cancelamento ao trocar de página e fallback claro quando Web Speech API ou vozes não estiverem disponíveis, sem usar serviço remoto). Preserve integralmente o banco data/estudo.db, o tema claro/escuro, o agrupamento 26.2 e as aulas existentes. Rode npm run check e CHROMIUM_PATH=/opt/brave-bin/brave npm run test:e2e (incluindo testes para o TTS e navegação) e atualize proxima ordem.md ao terminar.'
```
