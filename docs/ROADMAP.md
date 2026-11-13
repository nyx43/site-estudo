# Plano de execução e passagem para outros agentes

O usuário autorizou desenvolvimento com um único agente agora e colaboração futura. Não iniciar delegação automaticamente. As decisões ainda podem mudar; preservar dados e contratos afetados.

## Implementado

- Site responsivo, busca, filtros por categoria e estado de andamento, páginas de disciplina e tópico, alternância de tema claro/escuro e API de consulta.
- Currículo planejado de 14 disciplinas, 52 módulos e 121 tópicos, com apresentações, guias de módulo, objetivos, pré-requisitos, roteiros, equívocos e atividades propostas.
- Organização do período **26.2 (Nível 1)** orientada por dados (`lifecycleStatus` e `academicTrack`), destacando as cinco disciplinas acadêmicas (*Complexidade de Algoritmos e Estrutura de Dados*, *Desenvolvimento de Softwares para Web*, *Engenharia de Requisitos de Softwares*, *Sistemas Operacionais* e *Gerenciamento de Banco de Dados*) como **Em desenvolvimento**, *Python* como **Pausada** (preservando acesso integral às aulas) e as demais sete disciplinas como **Em breve**, sem incluir *APTA* e diferenciando currículo planejado de aulas disponíveis.
- Inventário preliminar das 68 entradas do Google Drive em [INVENTARIO_26_2.md](INVENTARIO_26_2.md) com desambiguação por ID/timestamp e registro explícito dos arquivos que ainda pendem de acesso/leitura local sem inventar localizadores.
- Quatro aulas aprofundadas de Python: Variáveis e tipos, Condicionais, Laços de repetição e Listas e dicionários. Comandos, exemplos completos por linha, casos específicos, revisão de erros de IA e fontes reais.
- Leitura completa sem exigir respostas; percurso guiado em 10 partes, com reflexão e 32 exercícios nas versões atuais (44 no histórico).
- Correção determinística de quizzes, Parsons com indentação, exemplos com erro e previsão. Respostas abertas são reflexão, sem nota automática de domínio.
- Drizzle/SQLite, migrações aditivas (`0000` a `0004`), seed transacional, retomada e idempotência. Gabaritos privados até o momento permitido.
- Versionamento que preserva aulas e respostas em uso, incluindo retomada da versão anterior de Laços.
- Fluxo documentado para gerar aulas e exercícios a partir de futuros slides e livros, sem publicar arquivos crus.

Resultados executados estão em [VALIDATION.md](VALIDATION.md) e [proxima ordem.md](../proxima%20ordem.md). As aulas estão em AUTO_CHECKED; o usuário fará a avaliação detalhada depois. A fila em [REVIEW_QUEUE.md](REVIEW_QUEUE.md) não bloqueia as próximas tarefas independentes.

## Próximas entregas

> **Diretriz de priorização (atualizada em 13/11/2026):** Não produzir dezenas de aulas antes de estabelecer a experiência de estudo com TTS por bloco e o laboratório de programação real. A análise dos materiais do período 26.2 pode avançar em paralelo desde que os arquivos brutos estejam efetivamente acessíveis.

| Prioridade | Trabalho | Critério de aceite |
| --- | --- | --- |
| 1 | **Fase 1 — Experiência de estudo e TTS por bloco** | Melhorar navegação por seções, posição atual, acessibilidade por teclado e retomada confiável (sem confundir leitura com domínio); implementar TTS local sob demanda por bloco (reproduzir, pausar, retomar, parar, voz/velocidade persistidas localmente e fallback claro quando indisponível, sem serviço remoto). |
| 2 | **Fase 2 — Laboratório de programação real (piloto em Python)** | Editor acessível na aula de Laços com execução isolada verificada (sem rede, sem acesso ao checkout/banco/home, limites de tempo/CPU/memória/processos/saída, falha fechada se isolamento não estiver disponível), salvamento de rascunho e testes determinísticos/adversariais. |
| 3 | **Leitura efetiva e análise das fontes de 26.2 (em paralelo quando acessíveis)** | Ler os arquivos brutos das 5 pastas do Drive quando disponíveis localmente/por conector, completar localizadores reais (páginas/slides/seções) em `docs/INVENTARIO_26_2.md`, inspecionar estaticamente ZIPs/planilha/imagens sem executar código e esclarecer lacuna de SQL em Banco de Dados. |
| 4 | **Fase 3 — Primeiras aulas completas das cinco disciplinas de 26.2 (em lotes)** | Após TTS e laboratório, produzir uma primeira fatia completa por disciplina do período 26.2 com fontes e localizadores reais verificados, evoluindo do nível 1 para camadas mais profundas sem quebrar IDs ou histórico. |
| 5 | **Fase 4 — Revisão espaçada, progresso e expansão modular** | Organizar histórico e revisão por dificuldade sem converter leitura em domínio; expandir laboratório e projetos integradores mantendo arquitetura local, modular e de baixo custo. |

O material real da faculdade poderá mudar nomes, recortes e a ordem de produção. O desenvolvimento autorizado continua sem aguardar a avaliação pessoal; correções posteriores devem respeitar o histórico.

Execução de código do aluno, competências e projetos profissionais são evoluções posteriores. O app móvel depende de decisões sobre autenticação, acesso, persistência, estudo offline e sincronização; a API atual é uma base, não uma implementação dessas capacidades.

## Colaboração futura

Antes de dividir trabalho, registrar por tarefa: objetivo, arquivos sob responsabilidade, dependências, contrato de entrada/saída, testes de aceite e limitações. Separar autoria por disciplinas ou módulos; usar AUTHORING.md e o modelo de mapeamento de materiais.

Definir responsável por integração. Coordenar alterações em schemas, migrações, dependências, lockfile e contratos públicos; não deixar dois agentes editarem esses arquivos simultaneamente. Cada tarefa da nuvem já é isolada; não criar worktrees sem solicitação explícita.

Uma tarefa termina quando o comportamento acordado foi verificado. Relatar separadamente bloqueios ambientais, defeitos do produto, testes não executados e recursos futuros. Nunca atribuir aprovação humana a uma verificação automática.

## Frameworks e aplicativo

Django, React e Node.js foram solicitados como expansões futuras. O mapa de pré-requisitos e o critério para começar o app estão em [TECHNOLOGY_TRACKS.md](TECHNOLOGY_TRACKS.md). O aplicativo ainda não começou; consolidar primeiro o ciclo do site, sem exigir terminar todas as disciplinas.
