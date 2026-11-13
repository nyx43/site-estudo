# Plano de execução e passagem para outros agentes

O usuário autorizou desenvolvimento com um único agente agora e colaboração futura. Não iniciar delegação automaticamente. As decisões ainda podem mudar; preservar dados e contratos afetados.

## Implementado

- Site responsivo, busca, filtros, páginas de disciplina e tópico e API de consulta.
- Currículo planejado de 13 disciplinas, 49 módulos e 115 tópicos, com apresentações, guias de módulo, objetivos, pré-requisitos, roteiros, equívocos e atividades propostas.
- Três aulas aprofundadas de Python: Variáveis e tipos, Condicionais e Laços de repetição. Comandos, exemplos completos por linha, casos específicos, revisão de erros de IA e fontes reais.
- Leitura completa sem exigir respostas; percurso guiado em 10 partes, com reflexão e 24 exercícios nas versões atuais.
- Correção determinística de quizzes, Parsons com indentação, exemplos com erro e previsão. Respostas abertas são reflexão, sem nota automática de domínio.
- Drizzle/SQLite, migrações, seed transacional, retomada e idempotência. Gabaritos privados até o momento permitido.
- Versionamento que preserva aulas e respostas em uso, incluindo retomada da versão anterior de Laços.
- Fluxo documentado para gerar aulas e exercícios a partir de futuros slides e livros, sem publicar arquivos crus.

Resultados executados estão em [VALIDATION.md](VALIDATION.md). As aulas estão em AUTO_CHECKED; o usuário fará a avaliação detalhada depois. A fila em [REVIEW_QUEUE.md](REVIEW_QUEUE.md) não bloqueia as próximas tarefas independentes.

## Próximas entregas

| Prioridade | Trabalho | Critério de aceite |
| --- | --- | --- |
| 1 | Completar fundamentos das demais linguagens iniciais | Aulas desde a base, exemplos próprios da linguagem, casos de revisão de IA e exercícios alinhados; verificações apropriadas |
| 2 | Aprofundar Dados e funções em Python | Listas/dicionários, funções, escopo e mutabilidade; preservar pré-requisitos, versões e progresso |
| 3 | Produzir aulas de Web e Requisitos | Exemplos e artefatos adequados à disciplina; explicar comandos ou decisões, critérios e erros comuns |
| 4 | Incorporar materiais enviados pelo usuário | Mapear fontes e páginas/slides, identificar lacunas, gerar aulas e exercícios autorais; seguir AUTHORING.md |
| 5 | Ampliar os novos módulos e disciplinas | Cobertura rastreável, sem confundir currículo planejado com conteúdo escrito; manter profundidade |
| 6 | Revisão espaçada e tutor simulado | Agendamento e níveis de ajuda testados, com critérios de feedback e privacidade |
| 7 | Integração real de IA | Provedor substituível, falhas tratadas, validação de conteúdo e revisão editorial |

O material real da faculdade poderá mudar nomes, recortes e a ordem de produção. O desenvolvimento autorizado continua sem aguardar a avaliação pessoal; correções posteriores devem respeitar o histórico.

Execução de código do aluno, competências e projetos profissionais são evoluções posteriores. O app móvel depende de decisões sobre autenticação, acesso, persistência, estudo offline e sincronização; a API atual é uma base, não uma implementação dessas capacidades.

## Colaboração futura

Antes de dividir trabalho, registrar por tarefa: objetivo, arquivos sob responsabilidade, dependências, contrato de entrada/saída, testes de aceite e limitações. Separar autoria por disciplinas ou módulos; usar AUTHORING.md e o modelo de mapeamento de materiais.

Definir responsável por integração. Coordenar alterações em schemas, migrações, dependências, lockfile e contratos públicos; não deixar dois agentes editarem esses arquivos simultaneamente. Cada tarefa da nuvem já é isolada; não criar worktrees sem solicitação explícita.

Uma tarefa termina quando o comportamento acordado foi verificado. Relatar separadamente bloqueios ambientais, defeitos do produto, testes não executados e recursos futuros. Nunca atribuir aprovação humana a uma verificação automática.
