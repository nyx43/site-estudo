# Estudo ES

Plataforma pessoal de estudos de Engenharia de Software. Primeiro incremento: catálogo curricular navegável com cinco disciplinas, 15 módulos e 47 tópicos planejados. As aulas e os exercícios ainda não foram implementados.

O projeto começa como site e deve acomodar dezenas de disciplinas e um aplicativo móvel. O conteúdo é dado versionado; regras de negócio e acesso ao banco ficam fora dos componentes.

## Executar

Requisitos: Node.js 24 e npm. Versões exatas das dependências estão no `package-lock.json`.

```bash
npm ci
cp .env.example .env # somente se .env ainda não existir
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

O Prisma precisa de acesso a `binaries.prisma.sh`, além de `registry.npmjs.org`. Não desative verificações TLS ou de checksum. No ambiente da nuvem, se o diretório de cache padrão do npm não for gravável, use `npm --cache /workspace/.cache/npm ci`.

`DATABASE_URL="file:./dev.db"` é relativo ao schema: o banco fica em `prisma/dev.db`, ignorado pelo Git. Nunca use `migrate reset` para atualizar um banco com progresso real.

### Consulta do currículo sem banco

```bash
npm ci
CATALOG_STORAGE=files npm run dev
```

Esse modo lê e valida os JSONs em `content/curriculum`. É uma consulta somente de leitura para autoria e revisão do plano curricular. Não salva progresso nem substitui os testes do SQLite. O modo padrão é `prisma`; uma falha de banco não aciona fallback automático.

## Verificar

| Comando | Verificação |
| --- | --- |
| `npm run content:validate` | Contratos, duplicatas, referências e ciclos de pré-requisitos |
| `npm run lint` | Regras estáticas |
| `npm run typecheck` | TypeScript estrito; requer o cliente Prisma gerado |
| `npm test` | Contratos, currículo, busca, serviço e tratamento de erros da API |
| `npm run test:db` | Migração real, seed repetível e equivalência entre adaptadores; usa SQLite temporário |
| `npm run build` | Build de produção e tipos |
| `npm run test:e2e` | Navegação, busca, filtros e API em Chromium desktop e móvel |
| `npm run check` | Currículo, lint, tipos, testes unitários, banco e build |

Playwright usa `/usr/bin/chromium` quando disponível e, caso contrário, o navegador instalado por `npx playwright install chromium`. Também é possível definir `CHROMIUM_PATH`. Os testes E2E iniciam um servidor no modo de arquivos por padrão; para testar o banco, use `CATALOG_STORAGE=prisma npm run test:e2e` depois de migrar e popular o banco. Não execute um servidor no mesmo diretório de build durante `npm run build`.

## Conteúdo e arquitetura

```text
content/curriculum/        Planejamento curricular das disciplinas
src/lib/catalog/          Contratos, porta do repositório, serviço e busca
src/lib/content/          Leitura, validação e consulta de arquivos
src/lib/db/               Adaptador Prisma e seed transacional
src/lib/http/             Contratos HTTP e tratamento de falhas
src/app/                  Páginas e rotas finas
src/components/           Apresentação e interação
prisma/                   Schema e migrações
tests/                    Unidades, integração de banco e percursos
docs/                     Decisões, currículo e backlog
```

API de leitura: `GET /api/subjects`, `GET /api/subjects/[slug]` e `GET /api/topics/[id]`. Respostas de sucesso usam `{ data, meta: { version: 1 } }`; falhas usam `{ error: { code, message } }`, com 404 para recurso ausente e 503 para indisponibilidade. Identificadores de tópicos seguem `disciplina.slug-do-topico`.

Para adicionar uma disciplina, crie um JSON compatível com `SubjectSchema`, valide o currículo e rode o seed. Não é necessário criar páginas específicas. O seed atualiza registros conhecidos em transação e preserva registros locais ausentes dos arquivos; remoções e renomeações exigem uma migração de conteúdo deliberada.

- [Plano e backlog](docs/ROADMAP.md)
- [Arquitetura e decisões revisáveis](docs/ARCHITECTURE.md)
- [Planejamento curricular](docs/CURRICULUM.md)
- [Orientações para agentes](AGENTS.md)
- [Resultados e pendências de validação](docs/VALIDATION.md)

O documento mestre v2.3 é uma referência de produto; as decisões posteriores do usuário prevalecem. Os textos do currículo são propostas de autoria inicial, sem aprovação pedagógica humana implícita. Futuras aulas precisarão de validação e revisão antes de receber status de conteúdo verificado.
