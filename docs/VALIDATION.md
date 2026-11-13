# Validação da fundação e do piloto

Executada em 13/11/2026 no ambiente da nuvem, Node.js 24.22.1 e npm 11.9.0.

- Currículo válido: 5 disciplinas, 15 módulos e 47 tópicos.
- TypeScript estrito, lint e build de produção: passaram.
- Instalação limpa com `npm ci`, migração e seed: passaram.
- Testes unitários: 37 passaram, incluindo contratos, correção dos quatro tipos, alternativas incorretas, indentação e remoção de respostas privadas.
- Integração SQLite: 18 passaram, incluindo migração repetida, seed idempotente, referências, equivalência de adaptadores, retomada após reabrir o banco, tentativas, idempotência e gravações simultâneas.
- Chromium desktop e móvel usando banco exclusivo de testes: 10 percursos passaram, incluindo aula completa, todos os tipos de exercício, retomada e reenvio após perda da resposta na rede.
- Verificação offline: 9 exemplos/soluções Python executados com sucesso em bubblewrap sem rede ou acesso ao projeto, com limites de tempo, memória, escrita e saída. Executado fora do sandbox interno do agente para permitir criar o sandbox de execução; nenhuma verificação foi desativada.
- Nenhuma verificação de integridade ou de tipos foi desativada.

O bloqueio anterior de engines Prisma foi resolvido substituindo o adaptador por Drizzle com SQLite, conforme a decisão 003. O domínio binaries.prisma.sh não é requisito do projeto atual. A publicação do ambiente e a execução do workflow no GitHub ainda são etapas distintas e não estão confirmadas neste relatório.

A aula está em AUTO_CHECKED. As verificações automáticas não substituem revisão pedagógica humana, que permanece pendente. IA real, revisão espaçada, autenticação, sincronização mobile e execução de código do aluno não foram implementadas neste incremento.
