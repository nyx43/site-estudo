# Validação do primeiro incremento

Executada em 13/11/2026, Node.js 24.22.1, npm 11.9.0, Linux. Este registro descreve a instância atual, não uma publicação ou restauração de snapshot em outra tarefa.

| Verificação | Resultado observado |
| --- | --- |
| Instalação com lockfile (`npm ci`) | Passou, usando cache gravável em `/workspace/.cache/npm` |
| `npm run content:validate` | Passou: 5 disciplinas, 15 módulos, 47 tópicos |
| `npm run lint` | Passou, sem avisos |
| `npm test` | 17 testes passaram em 2 arquivos |
| `npm run test:e2e` | 4 testes passaram: 2 percursos em desktop e 2 em viewport móvel, com Chromium real e catálogo de arquivos |
| Inspeção visual | Página inicial inspecionada em 1440px; navegação móvel exercitada nos percursos |
| SQL da migração inicial | Aplicado em SQLite temporário; unicidade e chave estrangeira exercitadas; não equivale a validação via Prisma |
| `npm run db:generate` | Bloqueado: proxy recusou o download verificado de engines em `binaries.prisma.sh` com 403 |
| `npm run typecheck` | Falhou por ausência dos tipos gerados do modelo Prisma; geração dos tipos de rotas Next passou |
| `npm run build` | Compilação de aplicação passou; build completo falhou na checagem dos tipos Prisma não gerados |
| `db:migrate`, `db:seed` e `test:db` via Prisma | Não executados com sucesso: geração do cliente é pré-requisito pendente |
| E2E usando Prisma | Não executado; o percurso validado usa `CATALOG_STORAGE=files` |
| GitHub Actions | Workflow criado; não executado no GitHub nesta tarefa |

## Pendência externa e retomada

Foi salvo um rascunho de rede adicionando `binaries.prisma.sh` aos domínios personalizados, preservando os presets existentes. Isso não aplicou a liberação à instância atual. Também foram salvas instruções de instalação e inicialização para consulta em modo de arquivos.

Após aplicar a liberação nas configurações, confirmar o estado da rede e repetir com conexão nova:

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
npm run db:seed
npm run check
CATALOG_STORAGE=prisma npm run test:e2e
```

Antes dos percursos com Prisma, encerrar somente um eventual servidor do projeto iniciado no modo de arquivos, para que Playwright não reutilize o modo errado. Não desabilitar checksums, TLS, testes ou checagem de tipos para contornar a pendência. Atualizar este relatório após validar o banco e o build.

Revisão e salvamento das configurações, publicação do ambiente e execução em uma nova tarefa são etapas distintas. Nenhuma publicação ou restauração foi confirmada aqui.
