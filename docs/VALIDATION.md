# Validação do site e das primeiras aulas aprofundadas

Executada em 13/11/2026 no ambiente da nuvem, Node.js 24.22.1 e npm 11.9.0. Nenhum acesso ao computador pessoal do usuário.

- Currículo válido: 13 disciplinas, 49 módulos e 115 tópicos planejados. Três aulas atuais e 24 exercícios; quatro versões e 36 exercícios armazenados contando o histórico.
- TypeScript estrito, lint e build de produção: passaram.
- Instalação com lockfile, migração e seed: passaram; as duas novas migrações acrescentam guias de módulos e apresentações de disciplinas, sem redefinir o banco.
- Testes unitários: 45 passaram, incluindo contratos, referências de fontes, cobertura das linhas explicadas, correção dos quatro tipos e ausência de respostas privadas no conteúdo público.
- Integração SQLite: 20 passaram, incluindo migração repetida, seed idempotente, equivalência de adaptadores, persistência, idempotência, gravações simultâneas e preservação de progresso/tentativas ao acrescentar uma versão.
- Chromium desktop e móvel com banco exclusivo de testes: 14 percursos passaram. Incluem leitura completa sem perguntas, página em 360 px sem transbordamento horizontal, fontes, progresso inalterado pela leitura, retomada da versão anterior, quatro tipos de exercício e reenvio após perda da resposta de rede.
- Verificação offline: 61 exemplos/soluções Python conferidos em bubblewrap sem rede ou acesso ao projeto, incluindo entrada simulada e um ValueError intencional. Limites de tempo, memória, escrita e saída ativos. Executado fora do sandbox interno do agente para permitir criar o sandbox de execução.
- Nenhuma verificação de integridade ou de tipos foi desativada.

O download separado de engines Prisma deixou de ser requisito após a troca para Drizzle/SQLite. A publicação do ambiente, implantação pública do site e execução do workflow no GitHub são etapas distintas e não estão confirmadas neste relatório.

As três aulas atuais estão em AUTO_CHECKED. A avaliação humana continua pendente e será feita posteriormente, sem interromper o desenvolvimento autorizado. As referências usadas nas explicações de Python são documentação oficial; não foram recebidos novos slides ou livros de disciplinas neste incremento. O fluxo de autoria com materiais está documentado, mas não há uploader nem geração automática integrada.

Os 115 tópicos são planejamento. IA real, revisão espaçada, autenticação, sincronização mobile e execução de código do aluno não foram implementadas neste incremento.
