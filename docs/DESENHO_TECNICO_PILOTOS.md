# Desenho técnico dos pilotos de aprendizagem

**Status:** conceito dos dois pilotos aprovado. Desenho técnico para revisão antes da implementação.  
**Base analisada:** `feat/plataforma-estudos` em `3a49206`, árvore limpa no início desta análise.  
**Escopo:** Fila Circular e Requisitos Testáveis. A referência pedagógica é `rascunhos-pilotos-estudo-es.md`, na pasta acima do repositório. A versão do arquivo usada tem seis atividades, três por piloto. Ao implementar, incorporar as atividades novas às definições versionadas para que o conteúdo do site fique autocontido no repositório.

## 1. Experiência proposta

| Onde | O que o estudante poderá fazer |
| --- | --- |
| Leitura em `/aulas/[topicId]` | Ler as explicações das três camadas e abrir **Praticar C1** diretamente nos dois pilotos. Fazer um exercício aqui não conclui etapas da aula guiada. |
| Estudo guiado em `/estudar/[topicId]` | Seguir as dez etapas atuais. A prática mostra C1 disponível de imediato nos pilotos e explica que C2/C3 ficam disponíveis após concluir o percurso guiado da mesma versão. Resolver C1 não é pré-requisito de C2 ou C3. |
| Prática | Rastrear, escolher, escrever ou comparar, conforme a atividade. Mostrar pré-requisitos recomendados, dicas sob demanda e feedback com próximo passo. Separar **Resolvido**, **Enviado para autoavaliação**, **Autoavaliação registrada** e **Solução consultada**. |
| Retomada | Retomar a última tentativa no mesmo exercício e a versão em que foi feita. Uma tentativa criada a partir da leitura também deve aparecer nos links de retomada, mesmo sem progresso guiado. |

A abertura de C1 durante a leitura é uma exceção explícita dos pilotos novos. A escolha da camada é livre dentro da leitura. A abertura de C2/C3 para prática livre pode ser reavaliada depois que houver dados de uso. A mesma política é aplicada no servidor e na interface. Para conteúdo legado, a ausência da permissão de acesso direto mantém a regra atual.

O caminho mais curto é um link da leitura para o workspace existente com versão, modo de prática e exercício selecionado. O link mostra a atividade. O botão **Iniciar prática** cria a tentativa. Visitar uma página ou abrir o link não deve criar tentativa nem registrar conclusão. Parâmetros de URL servem para navegação e o servidor valida que o exercício pertence à versão e pode ser aberto. Ler uma versão histórica a partir do estudo guiado deve levar à mesma versão da aula.

## 2. Conteúdo e versões

- Criar v2 para `estruturas-de-dados.pilhas-e-filas` e `requisitos.funcionais-e-nao-funcionais`. Preservar os arquivos v1, seus IDs, suas tentativas e as 36 atividades atuais das seis áreas. O seed atual rejeita alterações em exercícios já tentados, inclusive metadados. A política do seed continua valendo.
- Revisar os 12 exercícios dessas duas aulas antes de escrever. Usar como referência **7–10 atividades disponíveis por piloto**, incluindo reaproveitamentos e os três exercícios autorais. Proposta de partida: selecionar quatro dos seis existentes para a v2 e acrescentar os três dos rascunhos. A seleção final depende da cobertura e da redundância. Reaproveitados recebem novos IDs por pertencerem à v2. Um mesmo conteúdo copiado não conta como duas evidências independentes de competência. Os demais continuam disponíveis na v1.
- Candidatos à seleção em Fila Circular: ordem FIFO/LIFO, ambiguidade cheio/vazio, prática de pilha e verificação de delimitadores. Conferir se a ambiguidade já é coberta pelo novo C2. Em Requisitos, comparar classificação, estrutura SRS, detecção de ambiguidade e melhoria para teste. Evitar uma questão anterior que entregue a resposta de uma tarefa nova.
- Incluir na fila a equivalência entre `inicio` e `rpos`, `fim` e `spos`, e `tamanho` e `qtd`. O C3 terá uma explicação complementar de sobrecarga e recuperação, separada do conteúdo da aula original. Qualquer cenário de reprocessamento ou duplicidade precisa de explicação e critério próprios antes de ser exigido.
- Guardar no JSON de conteúdo a camada, o objetivo, as competências, os pré-requisitos, o contexto profissional opcional e o vínculo à explicação que prepara a atividade. C1/júnior, C2/pleno e C3/sênior são sugestões editoriais. Os campos são independentes, sem regra de validação que force o pareamento. Manter `difficulty` e `TeachingSchema.level` com seus significados e contratos atuais.
- Os três blocos de explicação podem ser representados como seções opcionais em uma aula versionada. Cada exercício novo referencia a seção correspondente. O formulário de autoria define critérios e fontes antes da conversão para o formato do site. As lacunas de quantidade viram avisos editoriais. Conteúdo inconsistente, IDs duplicados e referências inválidas são erros.

**Efeito da v2.** A versão nova passa a ser a padrão após validação e seed do fluxo completo. Durante as entregas intermediárias, fixtures ou rascunhos fora da pasta carregada pelo seed podem exercitar o contrato sem tornar uma v2 incompleta a opção padrão. Você poderá abrir a anterior pelo seletor, mesmo quando não houver progresso registrado. Não se copiam respostas, acertos ou etapas concluídas para a nova versão. O indicador de retomada considera respostas, etapas e tentativas. A busca por tentativas antigas deve ser agrupada por versão para evitar consultar cada exercício ao montar a lista do histórico.

## 3. Formatos e avaliação

Manter os quatro formatos atuais. O mínimo proposto para preservar os seis rascunhos é acrescentar dois formatos de estudo, com nomes abaixo apenas para ilustrar o contrato.

| Formato | Uso nos pilotos | Como seria avaliado |
| --- | --- | --- |
| **Resposta estruturada (`STRUCTURED_RESPONSE`)** | C1 de Fila Circular, com tabela de estados e valores removidos. Requisitos C1 pode usar o quiz atual para itens fechados ou o mesmo formato para registrar a classificação e interlocutores plausíveis. | Campos identificados por IDs, com inteiros ou escolhas conforme o caso. O servidor compara valores tipados e fornece feedback por linha ou critério, sem devolver os valores corretos antes do encerramento. Sem interpretação livre de texto como se houvesse resposta única. |
| **Resposta aberta (`OPEN_RESPONSE`)** | C2 de Fila com reprodução, trecho corrigido e testes propostos. Requisitos C2 com perguntas, hipóteses e critérios. Os dois C3 com decisões e rubrica. | O aluno envia campos de texto delimitados. O servidor valida formato e registra a entrega. Depois, revela a resposta de referência e permite marcar a rubrica. Não atribui acerto automático à argumentação, ao código entregue ou à qualidade dos testes. |

Para Requisitos C1, a classificação pode ser objetiva. Se a justificativa de escolha de um interlocutor for mantida como texto livre, ela entra como reflexão ou parte aberta, sem forçar um gabarito único. O aluno pode conhecer os critérios gerais antes de escrever. Exemplos preenchidos, respostas específicas e feedback privado são revelados após encerrar a tentativa.

Na Fila C2, oferecer um desafio Python em `content/labs/` e usar a rota de laboratório existente do tópico. O conteúdo define código inicial, operações suportadas e casos de teste fixos. O exercício pede um trecho corrigido e uma descrição dos testes próprios no envio de estudo. Rodar os casos fornecidos é uma ação separada e opcional. O envio de estudo não executa código automaticamente. No primeiro piloto a passagem do editor para o envio pode ser feita por copiar e colar. O feedback do laboratório fica no navegador como hoje. O resultado enviado pelo cliente não pode ser usado como evidência verificada pelo servidor.

Preparar casos da fila vazia e cheia, recusa sem sobrescrita e reaproveitamento das posições. Por exemplo, inserir A–D, retirar A e B, inserir E e F e confirmar saída C, D, E, F. Usar a sandbox Python existente, com limites e cancelamento. Sem sandbox disponível, o estudante ainda pode escrever e justificar, com indicação de que o código não foi executado. Casos fornecidos ao navegador são públicos. O código da solução de referência permanece no servidor.

## 4. Estado e persistência

A definição de aula e exercício já é armazenada como JSON em `Lesson.definition` e `Exercise.definition`. Os novos contratos podem ser estendidos para ler tanto conteúdo novo quanto legado. **Camadas, rubricas e gabaritos não exigem novas colunas.** Evitar defaults que modifiquem o JSON legado durante o parse e façam o seed enxergar uma mudança em material em uso.

O estudo reaproveita `Attempt` e `Submission`, mantendo um registro aberto por exercício e reenvios idempotentes. A resposta aberta pode ser guardada no JSON tipado de `Submission.answer`. A proposta de migração aditiva é limitada ao estado novo da tentativa:

| Campo proposto | Finalidade |
| --- | --- |
| `Attempt.revealedHintCount`, inteiro, começa em 0 | Quantas dicas daquela versão já foram reveladas nesta tentativa. O conteúdo da dica fica na definição privada. |
| `Attempt.selfAssessment`, JSON opcional | IDs dos critérios da rubrica que o aluno marcou após enviar uma resposta aberta. O valor ausente indica que a autoavaliação ainda não foi entregue. |

Uma resposta aberta aceita encerra o envio com o estado **Enviado para autoavaliação** e mantém a entrega disponível para consulta. O estado público é derivado da resposta aberta salva, do encerramento e do registro da rubrica. As colunas legadas de acerto permanecem sem acerto nesse fluxo, e a interface não interpreta isso como erro. A lista já tem contagem de acertos. Ela passa a exibir um estado separado para atividades abertas, sem somá-las como resolvidas por gabarito. Uma nova tentativa permite praticar de novo e não apaga a resposta anterior. No modelo objetivo, o acerto no primeiro envio continua sendo um fato. Para dizer **sem ajuda**, também é necessário que nenhuma dica tenha sido usada.

O laboratório continua sem um histórico SQLite de execuções. Seu rascunho, selo e resultado temporário não substituem o registro de entrega do exercício. O piloto não cria percentuais de domínio ou uma tabela transversal de competências. O reconhecimento de evidências usa apenas eventos observáveis, com separação entre validação automática, autoavaliação e revisão humana.

## 5. Serviço e API

- Em `src/lib/study/schema.ts`, acrescentar os formatos discriminados, a permissão de acesso explícita e os campos de autoria. A compatibilidade de leitura inclui v1 e v2. Validar limites de texto, células, chaves e tamanho total da requisição. Resposta aberta não passa pelo corretor binário.
- Em `src/lib/study/service.ts`, compartilhar a regra de acesso entre a visão da aula e a abertura de tentativa. O servidor resolve a aula e sua versão pelo exercício. Uma requisição direta para C2/C3 antes da conclusão da versão continua recebendo bloqueio. Ler a página ou acertar C1 não alteram `LessonProgress`.
- Estender `POST /api/attempts/[id]/submissions` para o formato estruturado e para a entrega aberta. Manter a chave `requestId`, rejeitar reutilização com outra resposta e impedir duplicação após recarga ou perda da resposta. Para atividades abertas, a primeira entrega válida fecha aquele envio e libera a referência. Desistir libera a solução sem criar entrega e não permite registrar autoavaliação como se tivesse respondido.
- Propor `POST /api/attempts/[id]/hints` com o número da dica solicitada. Repetir a solicitação da mesma dica retorna a dica já liberada. Pular uma dica é rejeitado. A operação grava e retorna a revelação em transação. Após encerramento, é possível consultar as já usadas, sem revelar outras por esse fluxo.
- Propor `PUT /api/attempts/[id]/self-assessment` para salvar, de modo repetível, o conjunto completo de critérios marcados. Validar os IDs contra a rubrica da versão, exigir entrega aberta existente e tratar a operação como autoavaliação. Não alterar o texto enviado nem o resultado do corretor. Usar as proteções de escrita, origem, limites e cache privado do serviço.
- Em `src/lib/study/public.ts`, selecionar campos públicos explicitamente. A resposta inicial pode conter a identificação da camada, a contagem de dicas e os critérios gerais. Os textos de dicas futuras e a solução de referência não entram no JSON, HTML inicial ou conteúdo de hidratação. Revelação de dica, submissão e encerramento usam o estado salvo para decidir o que devolver.

## 6. Implementação em entregas revisáveis

1. **Contrato e versionamento.** Conferir o Git e o trabalho do AGY antes de editar. Inventariar os 12 exercícios, congelar a ficha dos pilotos, criar as duas versões e validar referências. Ajustar testes de catálogo que fixam a quantidade de versões ou exercícios apenas conforme os dados novos. Incluir cópia restaurada e repetir o seed sem perder os registros.
2. **Prática antecipada e correção.** Implementar as duas formas de resposta, acesso C1 pelo percurso de leitura, tentativas, revelação de solução e retomada. Se o mesmo recurso atender os dois pilotos, mantê-lo no serviço e no componente genéricos, configurado pelo conteúdo.
3. **Dicas, rubrica e execução Python.** Adicionar o estado persistido na tentativa e conectar os controles. Criar o laboratório da fila a partir da interface e da sandbox existentes. Verificar navegação por teclado, TTS por bloco com IDs estáveis, tema claro/escuro e largura de 360 px.
4. **Avaliação dos dois pilotos.** Apresentar os percursos para revisão. Fazer uma variação inédita em outro contexto e propor uma revisita posterior como experimento manual. Usar as dificuldades observadas para calibrar as camadas e o volume antes de retomar o Lote 2.

As etapas são uma sequência de entrega, não ordens para iniciar trabalho agora. Schema, migrações e arquivos compartilhados precisam de um responsável por vez. Conferir o número da próxima migração quando houver implementação. A última existente na análise é `0004`. Validar em banco temporário criado a partir de backup antes de qualquer aplicação no banco pessoal.

## 7. Critérios de aceite da implementação futura

| Verificação | Resultado esperado |
| --- | --- |
| Acesso e histórico | C1 piloto inicia durante a leitura sem criar progresso guiado. C2/C3 aguardam o percurso guiado da versão. A versão antiga abre com seus dados, inclusive quando só contém tentativa. |
| Conteúdo e correção | Os dois pilotos apresentam 7–10 atividades como referência editorial. A tabela aceita apenas os estados válidos. Uma decisão aberta plausível recebe revisão por critérios e não aparece como resposta automaticamente errada ou correta. |
| Dicas e privacidade | Abrir duas vezes a mesma dica ou reenviar a requisição não avança o contador. A dica seguinte e a solução permanecem privadas até a ação que as libera. Consultar solução sem responder não gera autoavaliação. |
| Banco | Migração aditiva e dois seeds consecutivos preservam as aulas v1, as tentativas abertas e fechadas, a associação dos envios e o progresso. Backup/restauração são verificáveis em cópia separada. |
| Laboratório | A fila corrigida passa nos casos de regressão reais. Sandbox indisponível, cancelamento e timeout preservam o fluxo com mensagem apropriada, sem registrar execução inexistente. |
| Interface | Desktop e tela de 360 px, acessibilidade por teclado, TTS, temas e retomada após recarga. |

Comandos para a implementação futura: `npm run check`, `npm run verify:examples`, `npm run test:e2e` para os percursos afetados ou suíte, e verificação de backup em diretório externo quando houver migração. Nesta etapa foram inspecionados arquivos e contratos. As suítes da implementação ainda não se aplicam.

## 8. Decisões para revisar neste desenho

O desenho propõe C1 livre e C2/C3 após a aula guiada, duas extensões de formato, registro de dicas e autoavaliação na tentativa e laboratório com resultados locais no navegador. A principal escolha técnica é se vale oferecer feedback executável em C2 já no piloto por meio do laboratório separado. A alternativa mais curta é receber apenas a entrega escrita, o que reduz trabalho de interface mas elimina a prática de testar a fila dentro do site. A recomendação é manter o laboratório separado e usar a correção por rubrica na entrega de estudo.

Com a aprovação deste desenho, a primeira entrega é o **contrato e versionamento das duas aulas**, delimitada à etapa 1. A produção em escala depende da avaliação dos pilotos completos.

## Referências locais analisadas

- [Arquitetura e histórico](ARCHITECTURE.md) e [guia de autoria](AUTHORING.md).
- [Contratos](../src/lib/study/schema.ts), [serviço](../src/lib/study/service.ts), [repositório](../src/lib/db/study-repository.ts), [seed](../src/lib/db/seed-study.ts) e [tabelas SQLite](../src/lib/db/schema.ts).
- [Componentes de prática](../src/components/study/study-workspace.tsx) e [serviço do laboratório](../src/lib/lab/service.ts).
- [Cobertura 26.2](COBERTURA_26_2.md) e [fila de revisão](REVIEW_QUEUE.md).
