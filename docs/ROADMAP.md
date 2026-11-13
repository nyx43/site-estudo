# Plano de execução e passagem para outros agentes

O usuário autorizou a implementação inicial com um único agente. Outros agentes poderão participar depois. Não iniciar delegação automaticamente. O repositório começou apenas com um README.

## Entrega inicial — catálogo curricular

- Implementado: Next.js/TypeScript/Tailwind, catálogo responsivo, busca, filtros, página de disciplina, plano por tópico e API de leitura.
- Implementado: cinco planos curriculares, 15 módulos e 47 tópicos, com objetivos, pré-requisitos, roteiro, equívocos e critérios; 15 projetos futuros por módulo.
- Implementado: schema Drizzle/SQLite, migração inicial, seed transacional e adaptadores separados.
- Verificação: consultar o relatório final da tarefa. Não interpretar a existência de um teste como evidência de que ele já passou.
- Validação do armazenamento concluída com Drizzle/SQLite: a dependência de engines do Prisma foi removida, sem desativar verificações. Tipos, build, migrações, seed repetido e percursos com banco real passaram.
- O modo `CATALOG_STORAGE=files` permite revisar o catálogo sem Prisma. Ele não oferece progresso nem substitui a entrega do banco.

## Próximos pacotes

| Ordem | Objetivo | Dependências | Critério de aceite |
| --- | --- | --- | --- |
| 0 — concluído | Validar armazenamento SQLite | Adaptador Drizzle | Migração, seed duas vezes, `test:db`, tipos e build passaram; E2E passou com SQLite |
| 1 | Revisar currículo e escopo do piloto | Plano curricular | Objetivos e pré-requisitos revisados; tópico piloto e equívocos confirmados |
| 2 | Definir contratos de aula e exercício | 1 | Fixtures válidas e inválidas; DTO público separado dos gabaritos; transições editoriais documentadas |
| 3 | Escrever a aula-piloto | 2 | Blocos do documento-base, exemplos executáveis verificados em isolamento e revisão humana explícita |
| 4 | Implementar corretores puros | 2 | Quiz, Parsons, exemplo com erro e previsão, incluindo ordens equivalentes, entradas inválidas e feedback |
| 5 | Produzir os 12 exercícios | 3, 4 | 4 quizzes, 3 Parsons, 3 exemplos com erro, 2 previsões; objetivos e equívocos rastreáveis |
| 6 | Persistir tentativas e progresso de aula | 2, 4 | Retomada após recarregar, uma sessão com múltiplas submissões, fechamento consistente e sem atualização duplicada |
| 7 | Integrar o percurso completo | 3–6 | Escolher tópico, estudar, responder, receber correção e retomar; gabarito ausente do payload inicial |
| 8 | Revisão espaçada e tutor simulado | 7 | Sessões com itens vencidos/novos; testes do agendamento, níveis de ajuda e vazamento |
| 9 | IA real e autoria assistida | 8 | Provedor substituível, falhas tratadas, conteúdo inválido bloqueado e revisão editorial |
| 10 | Expandir conteúdo por módulos | Piloto estável | Cada módulo tem aulas e atividades completas, verificadas e alinhadas ao plano |

Execução de código do aluno permanece na etapa 5 do documento-base, depois da integração de IA; competências e projetos profissionais seguem como evoluções posteriores. O app móvel é uma frente futura, condicionada a requisitos de acesso e sincronização. O diagrama simplificado da página `/projeto` é uma visão de produto, não uma renumeração das etapas do PDF.

## Questões a resolver no pacote 2

- Representação de Parsons com indentação e ordens equivalentes.
- Critérios exatos de correção para exemplos com erro e previsão de saída.
- Idempotência da submissão e momento de fechamento de `Attempt`.
- Versionamento de aulas e efeito de uma revisão de conteúdo no progresso existente.
- Diferença entre conteúdo planejado, rascunho, verificação automática e aprovação humana.
- Critério de acesso ao feedback; responder incorretamente não deve expor automaticamente todos os gabaritos do tópico.

## Colaboração futura

Primeiro estabilizar contratos comuns. Depois dividir autoria de conteúdo, regras pedagógicas, API/persistência e interface. Definir um responsável por integração; mudanças de schema, migrações, dependências e contratos públicos precisam de coordenação. Não colocar dois agentes para editar esses arquivos compartilhados ao mesmo tempo.

Cada tarefa deve registrar: objetivo, arquivos sob responsabilidade, dependências, contrato de entrada/saída, testes de aceite e limitações. Evitar tarefas vagas como “fazer o backend”. Não criar worktrees sem solicitação explícita; cada tarefa da nuvem já é isolada.

Uma tarefa só está concluída quando o comportamento acordado foi verificado. Bloqueios ambientais, defeitos do produto, testes não executados e recursos futuros devem ser reportados separadamente.
