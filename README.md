# Estudo ES

Plataforma pessoal de estudos de Engenharia de Software. O catálogo organiza 14 disciplinas, 52 módulos e 121 tópicos, agrupando as cinco disciplinas acadêmicas do período 26.2 como **Em desenvolvimento** (profundidade inicial de nível 1), mantendo Python como **Pausada** (com quatro aulas aprofundadas e 32 exercícios ativos) e as demais como **Em breve**. As aulas não redigidas continuam marcadas como planejadas; não são conteúdo pronto.

As aulas completas ficam em `/aulas`, com leitura livre, comandos explicados, exemplos por linha, casos específicos e diagnóstico de erros em código de IA. O percurso guiado salva respostas e progresso. As quatro aulas atuais têm verificação automática (`AUTO_CHECKED`); a avaliação humana ficará para depois, conforme solicitado.

O projeto começa como site e deve acomodar dezenas de disciplinas e um aplicativo móvel. O conteúdo é dado versionado; regras de negócio e acesso ao banco ficam fora dos componentes.

## Executar

Requisitos: Node.js 24 e npm. Versões exatas das dependências estão no `package-lock.json`.

```bash
npm ci
cp .env.example .env # somente se .env ainda não existir
npm run db:migrate
npm run db:seed
npm run dev
```

Drizzle com SQLite local é instalado pelo npm, sem download adicional de engines. Não desative verificações TLS ou de checksum. No ambiente da nuvem, se o diretório de cache padrão do npm não for gravável, use `npm --cache /workspace/.cache/npm ci`.

`DATABASE_URL="file:./data/estudo.db"` é relativo à raiz do projeto. O arquivo do banco é ignorado pelo Git. Nunca redefina o banco para contornar uma migração.

### Consulta do currículo sem banco

```bash
npm ci
CATALOG_STORAGE=files npm run dev
```

Esse modo lê e valida os JSONs em `content/curriculum`. É uma consulta somente de leitura para autoria e revisão do plano curricular. O catálogo de arquivos não salva progresso; aulas e prática usam SQLite. O modo padrão é `sqlite`; uma falha de banco não aciona fallback automático.

## Verificar

| Comando | Verificação |
| --- | --- |
| `npm run content:validate` | Contratos, duplicatas, fontes, conexões, explicações por linha e ciclos de pré-requisitos |
| `npm run lint` | Regras estáticas |
| `npm run typecheck` | TypeScript estrito e tipos de rotas Next |
| `npm test` | Contratos, currículo, busca, serviço e tratamento de erros da API |
| `npm run test:db` | Migração real, seed repetível e equivalência entre adaptadores; usa SQLite temporário |
| `npm run build` | Build de produção e tipos |
| `npm run test:e2e` | Navegação, busca, filtros e API em Chromium desktop e móvel |
| `npm run check` | Currículo, lint, tipos, testes unitários, banco e build |

Playwright usa `/usr/bin/chromium` quando disponível e, caso contrário, o navegador instalado por `npx playwright install chromium`. Também é possível definir `CHROMIUM_PATH`. Os percursos criam seu próprio banco em `.cache/e2e-*.db` e servidor na porta 3100. Eles não reutilizam o servidor ou o progresso de desenvolvimento. Não execute um servidor no mesmo diretório de build durante `npm run build`.

### Aulas e prática

Depois de migrar e popular o banco, abra `/aulas`. A leitura mostra todo o conteúdo sem perguntas de desbloqueio e não marca partes como concluídas. Cada aula oferece também um percurso guiado de 10 partes, pré-perguntas sem nota, exemplos explicados e autoexplicação. As respostas e partes concluídas ficam salvas no SQLite.

Variáveis e Condicionais têm 6 exercícios cada; Laços tem 12 e Listas e dicionários tem 8. A prática combina quizzes, ordenação de blocos (Parsons), exemplos com erro e previsão de saída. A correção é determinística no servidor. Uma tentativa pode ter vários envios e fecha ao acertar ou consultar a solução. Reenvios com o mesmo identificador não duplicam registros. A solução fica privada enquanto a tentativa estiver aberta; respostas-modelo das perguntas só são liberadas após o aluno responder, e os palpites são retomados no resumo.

A versão 1 de Laços permanece preservada. A versão 2 aprofunda o conteúdo sem alterar respostas ou tentativas antigas; quem já estudava a v1 pode retomá-la pelo link na aula guiada. Há cinco versões armazenadas e 44 exercícios no histórico, dos quais quatro versões e 32 exercícios são atuais.

Os programas do aluno não são executados. Os exemplos e gabaritos Python do conteúdo podem ser verificados offline com `npm run verify:examples`, que exige Python 3 e bubblewrap funcional. O comando usa sandbox sem rede ou acesso ao checkout, com limites de tempo, memória, escrita e saída; falha se o isolamento não estiver disponível. No sandbox interno do agente na nuvem, esse comando precisa de uma execução aprovada fora dele para criar o sandbox bubblewrap. O comando não faz parte de `check`, e sua execução deve ser reportada separadamente.

A revisão humana continua necessária para fatos, linguagem e qualidade pedagógica. Não converter `AUTO_CHECKED` em `VERIFIED` apenas por os testes passarem.

## Conteúdo e arquitetura

```text
content/curriculum/        Planejamento curricular das disciplinas
content/study/             Aulas e exercícios versionados, com gabaritos privados
content/sources/           Metadados de referências reais, sem materiais brutos
src/lib/catalog/          Contratos, porta do repositório, serviço e busca
src/lib/study/            Casos de uso e contratos de estudo
src/lib/pedagogy/         Correção determinística pura
src/lib/content/          Leitura, validação e consulta de arquivos
src/lib/db/               Adaptador Drizzle/SQLite e seed transacional
src/lib/http/             Contratos HTTP e tratamento de falhas
src/app/                  Páginas e rotas finas
src/components/           Apresentação e interação
db/migrations/            Migrações SQL versionadas
tests/                    Unidades, integração de banco e percursos
docs/                     Decisões, currículo e backlog
```

API de leitura: `GET /api/subjects`, `GET /api/subjects/[slug]` e `GET /api/topics/[id]`. Respostas de sucesso usam `{ data, meta: { version: 1 } }`; falhas usam `{ error: { code, message } }`, com 404 para recurso ausente e 503 para indisponibilidade. Identificadores de tópicos seguem `disciplina.slug-do-topico`.

Para alterar o banco, edite `src/lib/db/schema.ts`, gere uma migração com `npm run db:generate -- --name descricao` e revise o SQL antes de aplicá-lo. Para adicionar uma disciplina, crie um JSON compatível com `SubjectSchema`, valide o currículo e rode o seed. Não é necessário criar páginas específicas. O seed atualiza registros conhecidos em transação e preserva registros locais ausentes dos arquivos; remoções e renomeações exigem uma migração de conteúdo deliberada.

- [Plano e backlog](docs/ROADMAP.md)
- [Arquitetura e decisões revisáveis](docs/ARCHITECTURE.md)
- [Planejamento curricular](docs/CURRICULUM.md)
- [Autoria a partir de materiais](docs/AUTHORING.md)
- [Fila de revisão posterior](docs/REVIEW_QUEUE.md)
- [Orientações para agentes](AGENTS.md)
- [Resultados e pendências de validação](docs/VALIDATION.md)

O documento mestre v2.3 é uma referência de produto; as decisões posteriores do usuário prevalecem. Slides e livros futuros serão fontes para gerar aulas, lições e exercícios próprios, com capítulos/páginas rastreáveis. Os arquivos crus não entram em `public/` ou no Git. O fluxo para os próximos agentes está em `docs/AUTHORING.md`; não existe uploader ou geração automática por IA nesta versão.

## API de estudo

- `GET /api/lessons/[topicId]`: última versão da aula pública, progresso, exercícios e versões disponíveis; cache privado desativado. `?version=1` consulta uma versão histórica.
- `POST /api/lessons/[lessonId]/progress`: `ANSWER` com `questionId` e `answer`, ou `COMPLETE_STEP` com `step`. O parâmetro é o ID versionado da aula, apesar do nome compartilhado da pasta de rota.
- `GET /api/exercises/[id]`: enunciado público e estado da última tentativa.
- `POST /api/attempts`: inicia ou retoma uma sessão com `exerciseId`, após concluir a aula.
- `POST /api/attempts/[id]/submissions`: envia `requestId` UUID e uma resposta discriminada por `type`.
- `POST /api/attempts/[id]/give-up`: consulta a solução e encerra a sessão sem acerto.

Dados de estudo são pessoais e locais ao serviço de usuário único, sem autenticação ou sincronização entre dispositivos nesta versão. Antes de expor o serviço para outras pessoas, será necessário definir acesso e separar os históricos.
