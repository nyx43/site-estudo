# Plano de execução e passagem para outros agentes

O usuário autorizou desenvolvimento com um único agente agora e colaboração futura. Não iniciar delegação automaticamente. As decisões ainda podem mudar; preservar dados e contratos afetados.

## Implementado

- Site responsivo, busca, filtros por categoria e estado de andamento, páginas de disciplina e tópico, alternância de tema claro/escuro e API de consulta.
- Currículo planejado de 14 disciplinas, 52 módulos e 121 tópicos, com apresentações, guias de módulo, objetivos, pré-requisitos, roteiros, equívocos e atividades propostas.
- Organização do período **26.2 (Nível 1)** orientada por dados (`lifecycleStatus` e `academicTrack`), destacando as cinco disciplinas acadêmicas (*Complexidade de Algoritmos e Estrutura de Dados*, *Desenvolvimento de Softwares para Web*, *Engenharia de Requisitos de Softwares*, *Sistemas Operacionais* e *Gerenciamento de Banco de Dados*) como **Em desenvolvimento**, *Python* como **Pausada** (preservando acesso integral às aulas) e as demais sete disciplinas como **Em breve**, sem incluir *APTA* e diferenciando currículo planejado de aulas disponíveis.
- **Leitura em voz alta (TTS) local por bloco** reutilizável nas aulas completas (`/aulas/[topicId]`), no estudo guiado e nos blocos de código (`src/lib/study/tts.ts`, `TtsProvider`, `TtsToolbar`, `TtsBlock` e `CodeBlock`): controles por bloco com IDs estáveis, interrupção ao alternar blocos, pausa/retomada quando suportadas pelo navegador, seleção de voz e velocidade com persistência em `localStorage`, leitura contínua (`role="switch"`), alternância entre explicação textual e leitura literal para código Python, compatibilidade com tema claro/escuro e fallback claro no Linux/navegadores sem Web Speech API.
- Inventário preliminar das 68 entradas do Google Drive em [INVENTARIO_26_2.md](INVENTARIO_26_2.md) com desambiguação por ID/timestamp e registro explícito dos arquivos que ainda pendem de acesso/leitura local sem inventar localizadores.
- Quatro aulas aprofundadas de Python: Variáveis e tipos, Condicionais, Laços de repetição e Listas e dicionários. Comandos, exemplos completos por linha, casos específicos, revisão de erros de IA e fontes reais.
- Leitura completa sem exigir respostas; percurso guiado em 10 partes, com reflexão e 32 exercícios nas versões atuais (44 no histórico).
- Correção determinística de quizzes, Parsons com indentação, exemplos com erro e previsão. Respostas abertas são reflexão, sem nota automática de domínio.
- Drizzle/SQLite, migrações aditivas (`0000` a `0004`), seed transacional, retomada e idempotência. Gabaritos privados até o momento permitido.
- Versionamento que preserva aulas e respostas em uso, incluindo retomada da versão anterior de Laços.
- Fluxo documentado para gerar aulas e exercícios a partir de futuros slides e livros, sem publicar arquivos crus.

Resultados executados estão em [VALIDATION.md](VALIDATION.md) e [proxima ordem.md](../proxima%20ordem.md). As aulas estão em AUTO_CHECKED; o usuário fará a avaliação detalhada depois. A fila em [REVIEW_QUEUE.md](REVIEW_QUEUE.md) não bloqueia as próximas tarefas independentes.

## Próximas entregas

> **Diretriz de priorização (atualizada em 13/11/2026):** Concluído o TTS por bloco, a próxima prioridade imediata é estabelecer o **laboratório de programação Python real** com editor, execução isolada, console e testes automáticos antes de produzir dezenas de novas aulas. A análise dos materiais do período 26.2 pode avançar em paralelo desde que os arquivos brutos estejam efetivamente acessíveis.

| Prioridade | Trabalho | Critério de aceite |
| --- | --- | --- |
| 1 | **Fase 2 — Laboratório de programação Python real (piloto em Laços de repetição)** | Editor acessível na interface com console (`stdout`/`stderr`/entrada simulada), execução isolada verificada (sem rede, sem acesso ao checkout/banco/home, limites estritos de tempo/CPU/memória/processos/saída, falha fechada se o isolamento não estiver disponível), salvamento de rascunho local e testes automáticos determinísticos/adversariais. |
| 2 | **Leitura efetiva e análise das fontes de 26.2 (em paralelo quando acessíveis)** | Ler os arquivos brutos das 5 pastas do Drive quando disponíveis localmente/por conector, completar localizadores reais (páginas/slides/seções) em `docs/INVENTARIO_26_2.md`, inspecionar estaticamente ZIPs/planilha/imagens sem executar código e esclarecer lacuna de SQL em Banco de Dados. |
| 3 | **Fase 3 — Primeiras aulas completas das cinco disciplinas de 26.2 (em lotes)** | Após o laboratório real, produzir uma primeira fatia completa por disciplina do período 26.2 com fontes e localizadores reais verificados, evoluindo do nível 1 para camadas mais profundas sem quebrar IDs ou histórico. |
| 4 | **Fase 4 — Revisão espaçada, progresso e expansão modular** | Organizar histórico e revisão por dificuldade sem converter leitura em domínio; expandir laboratório e projetos integradores mantendo arquitetura local, modular e de baixo custo. |

O material real da faculdade poderá mudar nomes, recortes e a ordem de produção. O desenvolvimento autorizado continua sem aguardar a avaliação pessoal; correções posteriores devem respeitar o histórico.

Execução de código do aluno, competências e projetos profissionais são evoluções posteriores. O app móvel depende de decisões sobre autenticação, acesso, persistência, estudo offline e sincronização; a API atual é uma base, não uma implementação dessas capacidades.

## Colaboração futura

Antes de dividir trabalho, registrar por tarefa: objetivo, arquivos sob responsabilidade, dependências, contrato de entrada/saída, testes de aceite e limitações. Separar autoria por disciplinas ou módulos; usar AUTHORING.md e o modelo de mapeamento de materiais.

Definir responsável por integração. Coordenar alterações em schemas, migrações, dependências, lockfile e contratos públicos; não deixar dois agentes editarem esses arquivos simultaneamente. Cada tarefa da nuvem já é isolada; não criar worktrees sem solicitação explícita.

Uma tarefa termina quando o comportamento acordado foi verificado. Relatar separadamente bloqueios ambientais, defeitos do produto, testes não executados e recursos futuros. Nunca atribuir aprovação humana a uma verificação automática.

## Frameworks e aplicativo

Django, React e Node.js foram solicitados como expansões futuras. O mapa de pré-requisitos e o critério para começar o app estão em [TECHNOLOGY_TRACKS.md](TECHNOLOGY_TRACKS.md). O aplicativo ainda não começou; consolidar primeiro o ciclo do site, sem exigir terminar todas as disciplinas.
