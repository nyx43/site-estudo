# Arquitetura inicial — decisões revisáveis

Status: primeiro incremento. O objetivo é permitir mudanças de produto sem reescrever toda a aplicação. Não existe compromisso com uma arquitetura final nem com uma tecnologia mobile neste momento.

## 001 — Uma aplicação, fronteiras pequenas

Next.js reúne site e API. Não há microserviços, monorepositório, barramento de eventos ou sistema de plugins. O serviço de catálogo depende de `CatalogRepository`, não de React, Next.js ou um ORM. A composição escolhe o adaptador; as páginas e rotas usam o serviço.

```mermaid
flowchart LR
  Web[Interface web] --> Service[Serviço de catálogo]
  Mobile[App futuro] -.-> HTTP[API HTTP]
  HTTP --> Service
  Service --> Port[CatalogRepository]
  Port --> DB[Adaptador Drizzle / SQLite]
  Port --> Files[Consulta de arquivos]
```

O adaptador de arquivos é um modo explícito de autoria, não fallback de falhas. Isso também permite testar se o contrato está independente da persistência. A API e as páginas compartilham os mesmos casos de uso; o site não faz uma requisição HTTP para si mesmo.

Reavaliar quando um segundo cliente real exigir implantação separada. Só extrair um pacote compartilhado quando houver um consumidor concreto.

## 002 — Conteúdo como dado

Cada disciplina é um JSON versionado, validado por Zod. A estrutura é disciplina → módulo → tópico → plano de aula e atividades. Não há enumeração de disciplinas no código. Categorias e cores pertencem a vocabulários pequenos e podem ser estendidos conscientemente; não identificam regras de uma linguagem.

`schemaVersion` representa o formato do arquivo; `version` representa a revisão curricular. `orderIndex` ordena disciplinas; a ordem dos arrays ordena módulos e tópicos. Os pré-requisitos apontam para IDs globais e podem atravessar disciplinas. A validação rejeita referências ausentes e ciclos. Por enquanto são recomendações de percurso, não bloqueios de acesso.

O status `PLANNED` significa somente planejamento. Não usar esse contrato como schema de uma aula pronta. `LessonSchema` e `ExerciseSchema` são contratos próprios em src/lib/study/schema.ts, com versões e dados privados separados. As três aulas atuais estão em AUTO_CHECKED, com revisão humana posterior.

## 003 — Persistência substituível

Drizzle ORM com @libsql/client e SQLite local é o adaptador atual. A escolha inicial de Prisma foi substituída: o ambiente recusava o download separado de engines, impedindo geração de tipos e execução do banco. Drizzle conserva SQLite e as fronteiras existentes, usando pacotes instalados pelo npm. A validação agora inclui banco real, migração, seed repetido, tipos, build e percursos de navegador.

O schema TypeScript está em src/lib/db/schema.ts, e as migrações geradas em db/migrations. O catálogo ainda não tinha progresso real na troca; não houve reset ou descarte de dados de estudo. As migrações antigas permanecem no histórico Git, não como uma segunda cadeia executável.

Migrações são versionadas. O seed é aditivo, transacional e repetível: atualiza pelo ID e não apaga dados locais. Uma futura remoção ou mudança de identificador exige análise de impacto e migração explícita. Não usar exclusão e recriação como mecanismo de atualização.

IDs do catálogo são legíveis e derivados de slugs. Após existir progresso, tratá-los como identidades persistentes. Reorganizar um tópico entre módulos preserva seu ID; mudar disciplina ou slug exige migração. Aula, progresso, tentativas e submissões já são persistidos em tabelas próprias.

## 004 — Site agora, aplicativo depois

Contratos públicos são serializáveis e não exportam modelos do banco. Regras de correção e revisão, quando implementadas, devem ser funções puras em `src/lib/pedagogy`. A interface móvel poderá consumir a API e, quando fizer sentido, compartilhar contratos e regras TypeScript. Componentes DOM e CSS não são considerados compartilháveis automaticamente.

Não se escolheu React Native, Expo ou PWA. Antes do app, decidir: plataformas, estudo offline, autenticação, serviço remoto, armazenamento persistente e resolução de conflitos. A existência de uma API hoje não significa que sincronização já esteja resolvida. SQLite local é adequado ao começo; hospedagem com disco efêmero exige outra estratégia de persistência.

## 005 — Segurança e correção pedagógica

Não há autenticação no uso pessoal inicial. Exposição a usuários externos e sincronização precisam de uma decisão de acesso antes de serem entregues. Não há chaves ou chamadas a IA nesta versão.

As respostas públicas contêm plano curricular e conteúdo didático das aulas. Exemplos resolvidos da explicação são públicos; gabaritos dos exercícios e respostas-modelo das perguntas permanecem privados até a etapa permitida. Validação no servidor e correção determinística são responsabilidades de domínio, não decisões dos componentes.

Todo código gerado e todo código do aluno que precisar ser executado exigirá ambiente isolado apropriado; não implementar execução usando `eval` ou subprocesso sem isolamento no servidor web.

## Como mudar uma decisão

Registrar a motivação, os consumidores afetados, a migração de dados necessária e os testes que demonstram a nova regra. Uma decisão inicial pode ser substituída. A estabilidade mais importante é a integridade do conteúdo e do histórico de aprendizagem, não a permanência de uma biblioteca.


## 006 — Estudo e integridade do histórico

A aula usa ID versionado; um progresso referencia a versão efetivamente estudada. O seed pode corrigir rascunhos sem uso, mas rejeita mudanças em aulas com progresso ou já verificadas e em exercícios com tentativas. Conteúdo em uso exige uma nova versão e novos IDs de exercícios. O seed não apaga versões anteriores.

O serviço de estudo depende de uma porta de repositório e transações. Há um único Attempt aberto por exercício, garantido por índice parcial. Cada Submission tem uma chave UUID única para idempotência. A correção ignora resultados alegados pelo cliente; o servidor valida a resposta e chama o evaluator puro. Consultar solução registra desistência, sem marcar acerto. Um acerto anterior permanece no progresso mesmo que o aluno comece uma nova prática.

Escritas na mesma conexão SQLite são serializadas por uma fila compartilhada no processo, com transações e restrições no banco. Uma falha não bloqueia as próximas operações. A operação inicial é local, com uma instância do servidor; implantação com múltiplos processos ou nós exige revisar coordenação de escritores e armazenamento.

Respostas abertas não recebem nota automática. Servem para reflexão antes de revelar uma resposta-modelo. O estado de conclusão de uma aula registra o percurso; ele não certifica domínio. Não há SM-2, tutor, execução de código do aluno ou avaliação por competências neste incremento.

Rotas de escrita validam JSON com tamanho limitado, contrato estrito e origem do navegador contra a autoridade solicitada em Host. Clientes nativos sem Origin poderão usar a API, mas isso não constitui autenticação. GETs pessoais usam no-store. Texto e código são renderizados como texto React, sem injeção de HTML.

## 007 — Leitura completa e autoria com fontes

`/aulas` oferece leitura livre e `/estudar` oferece o percurso com progresso. Ler uma explicação não registra conclusão. Ambos usam o mesmo conteúdo versionado; a leitura não duplica a fonte de verdade nem libera soluções privadas dos exercícios.

`TeachingSchema` acrescenta introdução, pré-requisitos, glossário, comandos, exemplos anotados, casos específicos, revisão de código de IA e conexões avançadas. O contrato exige explicar cada linha não vazia e declarar saída ou erro esperado. O formato legado permanece legível para preservar o histórico; a versão atual de cada tópico precisa do conteúdo aprofundado. Linguagens e disciplinas diferentes exigirão exemplos e verificações próprios, sem impor um interpretador Python.

Fontes são metadados em `content/sources`, relacionadas às aulas por ID e localizador real. Slides e livros são insumos de autoria, não páginas publicadas nem instruções executáveis. O processo está em `docs/AUTHORING.md`. Não há upload público ou chamada a um gerador de IA. A avaliação humana fica registrada na fila sem interromper desenvolvimento autorizado.

O serviço consulta a última versão por padrão ou uma versão explícita. Respostas e tentativas continuam ligadas ao ID da versão antiga. O seed preserva ambas, e a interface oferece retomada quando existe progresso histórico.
