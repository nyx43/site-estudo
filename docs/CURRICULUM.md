# Planejamento curricular

Proposta inicial revisável: 14 disciplinas, 52 módulos e 121 tópicos. Há quatro aulas completas de Python; os demais tópicos representam planejamento. Cada disciplina tem uma apresentação, estado de andamento (`IN_PROGRESS`, `PAUSED` ou `UPCOMING`) e, quando aplicável, vínculo com o período acadêmico (`26.2`, nível 1). Cada módulo explica sua base, o conhecimento assumido e os critérios para revisar soluções de IA.

A fonte de verdade é `content/curriculum/*.json`. Cada tópico tem objetivos, pré-requisitos, roteiro, equívocos, atividades e critérios. Projetos são propostas futuras. A autoria segue [AUTHORING.md](AUTHORING.md), com avaliação humana registrada para depois em [REVIEW_QUEUE.md](REVIEW_QUEUE.md).

A sequência deve preservar profundidade ao crescer: fundamentos, aplicação, aprofundamento e situações específicas. Materiais da faculdade poderão alterar recortes e prioridades sem descartar as identidades e o histórico existentes.

## Python

Do primeiro raciocínio à automação: aprenda a ler, explicar e construir programas em Python.

### Fundamentos e fluxo

Valores, decisões e repetição como ferramentas para expressar um algoritmo.

- **Variáveis e tipos** — Entenda nomes, valores, conversões e operações antes de combinar instruções.
- **Condicionais** — Transforme regras em decisões com condições e caminhos alternativos.
- **Laços de repetição** — Acompanhe cada iteração, escolha entre for e while e evite erros de limite.

### Dados e funções

Organize coleções e decomponha soluções com responsabilidades claras.

- **Listas e dicionários** — Escolha entre sequências e associações e percorra dados estruturados.
- **Funções** — Separe entradas, processamento e resultados sem depender de variáveis globais.
- **Escopo, mutabilidade e referências** — Rastreie nomes e objetos para entender alterações inesperadas.

### Programas robustos

Arquivos, modelagem e testes para automações que lidam com falhas.

- **Arquivos e exceções** — Leia e grave dados com fechamento adequado e tratamento específico de erros.
- **Classes e objetos** — Modele estado e comportamento quando uma abstração justificar a classe.
- **Testes e automação** — Verifique comportamento com dados pequenos e resultados reproduzíveis.

### Protocolos e composição

Iteração, contratos e dependências explícitas.

- **Iteradores e geradores** — Dados sob demanda, consumo e término.
- **Anotações, contratos e fronteiras** — Tipagem estática, validação e limites do domínio.

### Execução e diagnóstico avançado

Concorrência, observabilidade e análise de custo.

- **Concorrência, async e cancelamento** — Coordenar tarefas sem presumir que tudo ficou paralelo.
- **Perfil, memória e diagnóstico** — Investigar lentidão e falhas com evidências.

## Java

Tipos, objetos e contratos para construir programas previsíveis e bem organizados.

### Linguagem e execução

Fundamentos da linguagem, controle de fluxo e semântica de valores.

- **Tipos primitivos e referências** — Diferencie valores primitivos, referências, igualdade e ausência de objeto.
- **Controle de fluxo** — Expresse decisões e repetições com condições verificáveis.
- **Métodos e passagem por valor** — Entenda o que uma chamada pode modificar no chamador.

### Objetos e contratos

Invariantes, composição e polimorfismo com responsabilidades explícitas.

- **Classes e encapsulamento** — Proteja invariantes em vez de apenas expor atributos por getters e setters.
- **Herança e polimorfismo** — Reconheça substituição de tipos e quando preferir composição.
- **Interfaces** — Defina capacidades e reduza dependências de implementações concretas.

### Coleções e qualidade

Escolha estruturas e verifique falhas sem perder segurança de tipos.

- **Coleções** — Escolha List, Set ou Map pelas operações e regras do problema.
- **Exceções e recursos** — Trate falhas no nível adequado e feche recursos com segurança.
- **Generics e testes** — Preserve tipos nas coleções e teste contratos observáveis.

### Design e APIs robustas

Contratos, imutabilidade e tipos em APIs.

- **Imutabilidade e design de APIs** — Estado válido, cópias defensivas e contratos.
- **Streams e limites de tipos** — Pipelines, operações terminais e segurança de tipos.

### Runtime e concorrência

Memória, coordenação e diagnóstico da JVM.

- **Concorrência e estado compartilhado** — Corridas, sincronização e cancelamento.
- **JVM e observabilidade** — Gargalos, memória e comportamento em execução.

## Ruby

Objetos, blocos e coleções com foco em leitura e intenção do código.

### Fundamentos e blocos

Valores, controle de fluxo e funções passadas como comportamento.

- **Objetos e valores** — Reconheça objetos, referências e regras de verdade da linguagem.
- **Métodos e fluxo** — Leia retorno implícito, parâmetros e condições sem ambiguidades.
- **Blocos e iteradores** — Entenda yield, parâmetros do bloco e iteração sobre coleções.

### Coleções expressivas

Chaves, valores e pipelines com semântica explícita.

- **Símbolos e strings** — Escolha representações para identificadores e textos sem conversões acidentais.
- **Hashes e arrays** — Modele sequências e associações e trate ausências de forma explícita.
- **Enumerable** — Combine seleção, transformação e redução com retorno previsível.

### Design e testes

Organize comportamento sem dependências escondidas.

- **Classes e estado** — Modele objetos pequenos com invariantes e interfaces claras.
- **Módulos e mixins** — Compartilhe capacidades e compreenda a busca por métodos.
- **Convenções e testes** — Interprete convenções e verifique comportamento com exemplos pequenos.

### Protocolos e metaprogramação

Composição, blocos e comportamento dinâmico.

- **Closures, Proc e lambda** — Captura de estado e diferenças de chamada.
- **Metaprogramação com limites** — Geração de métodos e contratos observáveis.

### Operação e qualidade

Dependências, desempenho e trabalho concorrente.

- **Gems e dependências** — Ambiente reproduzível e compatibilidade.
- **Concorrência e performance** — Medição, limites e estado compartilhado.

## Desenvolvimento Web

Da estrutura de uma página às interações e contratos que conectam a web.

### Estrutura e layout

Conteúdo semântico, fluxo visual e adaptação a telas diferentes.

- **HTML semântico** — Escolha elementos pela função e preserve uma estrutura compreensível.
- **CSS e box model** — Entenda cascata, herança e dimensões antes de ajustar layouts.
- **Flex, Grid e responsividade** — Escolha um modelo de layout e preserve legibilidade em diferentes telas.
- **Formulários e acessibilidade** — Conecte rótulos, instruções e erros a controles utilizáveis.

### JavaScript e interação

Estado, eventos e assincronia no navegador.

- **JavaScript: valores e funções** — Entenda referências, funções e comparações usadas na interface.
- **DOM e eventos** — Transforme interações em alterações de estado compreensíveis.
- **Assíncrono e fetch** — Trate espera, falhas e respostas fora de ordem.
- **Estado e componentes** — Separe dados, derivação e apresentação para facilitar mudanças.

### Contratos e qualidade

Conecte cliente e servidor com validação e verificação de comportamento.

- **HTTP e REST** — Leia requisições e defina recursos, métodos e códigos de resposta.
- **Validação e segurança básica** — Reconheça fronteiras de confiança e riscos de renderização e requisições.
- **Testes de aplicações web** — Verifique regras, contratos e percursos de uso sem depender de detalhes visuais.

### Sistemas web e consistência

Contratos, cache e estado distribuído.

- **Autenticação e autorização** — Identidade, sessões e permissão por recurso.
- **Cache e idempotência** — Atualidade, repetição e efeitos únicos.

### Qualidade e casos específicos

Acessibilidade, desempenho e diagnóstico em produção.

- **Performance e observabilidade web** — Medições de rede, servidor e renderização.
- **Acessibilidade em fluxos complexos** — Foco, anúncios e controles compostos.

## Análise de Requisitos

Transforme necessidades em decisões claras, critérios testáveis e escopo compreensível.

### Entender necessidades

Contexto, fontes e classificação antes de escolher uma solução.

- **Problema e stakeholders** — Identifique quem é afetado, o contexto e o resultado desejado.
- **Elicitação** — Escolha técnicas para descobrir necessidades e investigar divergências.
- **Funcionais e não funcionais** — Diferencie comportamento, qualidade e restrições de uma solução.

### Especificar e validar

Escrita clara, histórias e critérios que permitem verificar o resultado.

- **Ambiguidade e vagueza** — Encontre interpretações concorrentes e termos sem critério verificável.
- **Histórias de usuário e INVEST** — Use histórias como convite à conversa, com valor e recorte verificáveis.
- **Critérios de aceitação** — Transforme regras em exemplos que podem aprovar ou reprovar uma entrega.

### Gestão e mudança

Priorize, rastreie impactos e valide alterações sem perder o objetivo.

- **Priorização e MoSCoW** — Negocie valor, risco e dependências com critérios explícitos.
- **Casos de uso** — Descreva objetivos de atores, fluxo principal e alternativas relevantes.
- **Rastreabilidade e validação** — Conecte necessidade, requisito, implementação e teste para avaliar mudanças.

### Análise e negociação avançadas

Qualidade, conflitos e hipóteses de produto.

- **Cenários de qualidade** — Estímulo, contexto e resposta mensurável.
- **Domínio, conflitos e negociação** — Vocabulário, fronteiras e critérios concorrentes.

### Validação de especificações e IA

Rastreabilidade e revisão de decisões automatizadas.

- **Revisão de especificações geradas por IA** — Contradições, omissões e decisões inventadas.
- **Impacto e evolução contínua** — Mudanças de regra, compatibilidade e evidências.

## Algoritmos

Raciocínio, correção e custo antes de escolher uma implementação.

### Representar e rastrear

Um algoritmo descreve um procedimento para resolver uma classe de problemas.

- **Modelagem de algoritmos** — Entradas, saídas e passos observáveis.
- **Complexidade e tamanho da entrada** — Custo assintótico e limitações de uma medição.

### Busca e ordenação

Estratégias diferentes exploram propriedades diferentes dos dados.

- **Busca sequencial e binária** — Pré-condições, intervalos e elemento ausente.
- **Ordenação e estabilidade** — Comparadores e propriedades do resultado.

### Estratégias avançadas

Dividir um problema, escolher uma decisão local ou reutilizar subproblemas são estratégias distintas.

- **Guloso e divisão e conquista** — Decisões locais e decomposição.
- **Programação dinâmica** — Estados, recorrências e ordem de cálculo.

## Estruturas de Dados

Escolha representações pelas operações e garantias que o problema exige.

### Estruturas lineares

Estruturas organizam dados e delimitam o custo e o comportamento das operações.

- **Arrays, listas e referências** — Organização e custo de operações.
- **Pilhas e filas** — Ordem de atendimento e invariantes.

### Associações e árvores

Busca por chave e organização hierárquica exigem contratos de igualdade e ordem.

- **Tabelas hash e colisões** — Igualdade, distribuição e desempenho esperado.
- **Árvores de busca e balanceamento** — Invariantes e efeito da altura.

### Grafos e escolhas de projeto

Grafos representam relações em redes, dependências e caminhos.

- **Representação de grafos** — Vértices, arestas e direção.
- **Percursos e detecção de ciclos** — Visitação, componentes e término.

## Banco de Dados

Do modelo relacional às transações, índices e diagnóstico de consultas.

### Modelagem e integridade

Um banco representa regras sobre dados que persistem além de uma execução.

- **Modelo relacional e chaves** — Identidades, relações e restrições.
- **Normalização e dependências** — Redundância e anomalias.

### SQL e comportamento de consultas

SQL descreve resultados, mas os detalhes de junções, agrupamentos e valores ausentes mudam o conjunto produzido.

- **Consultas, filtros e joins** — Conjuntos de resultado e multiplicidade.
- **NULL e agregações** — Ausência, contagem e agrupamento.

### Transações e desempenho

Operações simultâneas precisam preservar invariantes mesmo quando há falha ou repetição.

- **Transações e concorrência** — Atomicidade, isolamento e invariantes.
- **Índices, planos e migrações** — Leitura eficiente e evolução sem descarte de dados.

## Git e Versionamento

Entenda estados, histórico e integração para revisar mudanças com segurança.

### Estados e histórico

Git registra snapshots e relações entre commits.

- **Estado, staging e commit** — O que realmente será registrado.
- **Histórico e remotes** — Referências, fetch e rastreamento.

### Branches e conflitos

Uma branch é uma referência móvel para um commit.

- **Branches e merge** — Ancestral comum e integração.
- **Conflitos e preservação de trabalho** — Resolver diferenças com contexto.

### Revisão e recuperação

Históricos úteis permitem localizar uma regressão e entender por que uma decisão foi tomada.

- **Revert, rebase e recuperação** — Efeitos sobre identidade de commits.
- **Revisão, bisect e regressões** — Relacionar diffs e comportamento.

## Testes de Software

Verifique comportamento com evidências que possam revelar defeitos reais.

### Casos e critérios

Um teste compara um comportamento observado com uma expectativa.

- **Casos de teste e oráculos** — De onde vem o resultado esperado.
- **Testes unitários** — Unidades, contratos e isolamento útil.

### Integração e percursos

Bancos, serviços e interfaces introduzem contratos que um teste isolado pode não exercitar.

- **Integração e contratos** — Dependências reais e compatibilidade.
- **Dublês e E2E** — Escolha de substituições e percursos.

### Estratégias avançadas

Cobertura indica execução, não garantia de correção.

- **Propriedades e teste de mutação** — Generalização e sensibilidade a defeitos.
- **Confiabilidade e falhas de ambiente** — Diagnóstico de testes intermitentes.

## Arquitetura de Software

Organize decisões, fronteiras e dependências a partir de requisitos concretos.

### Módulos e dependências

Arquitetura organiza decisões que afetam muitos consumidores.

- **Modularidade, coesão e acoplamento** — Responsabilidades e impactos de mudança.
- **Camadas, portas e adaptadores** — Separar regra e mecanismo.

### Qualidades e domínio

Decisões arquiteturais têm custos e atendem cenários de qualidade.

- **Domínio e contextos** — Vocabulário e regras em fronteiras explícitas.
- **Decisões e trade-offs** — Alternativas, consequências e revisão.

### Distribuição e evolução

Separar processos cria latência, falhas parciais e problemas de consistência que não existiam do mesmo modo numa chamada local..

- **Falhas parciais e comunicação** — Latência, timeout e repetição.
- **Eventos e consistência** — Ordem, duplicação e estado derivado.

## Redes de Computadores

Acompanhe uma comunicação por suas camadas, nomes, conexões e falhas.

### Endereços e camadas

Uma aplicação depende de serviços diferentes para localizar e alcançar outra: nomes, endereços e protocolos não são a mesma coisa..

- **Endereços, portas e camadas** — Responsabilidades e identificação de destinos.
- **DNS e resolução** — Nomes, registros e cache.

### Transporte e proteção

Uma conexão entrega dados sob regras que não garantem, por si só, que a aplicação terminou a operação desejada..

- **TCP e UDP** — Fluxos, mensagens e confiabilidade.
- **TLS e identidade do servidor** — Criptografia e verificação de identidade.

### HTTP e diagnóstico

Uma requisição pode falhar no cliente, proxy, transporte ou serviço remoto.

- **HTTP, proxies e políticas** — Responsabilidades de intermediários.
- **Diagnóstico de rede** — Hipóteses e testes por camada.

## Segurança de Software

Reconheça fronteiras de confiança e transforme riscos em verificações concretas.

### Ameaças e entradas

Segurança começa por identificar ativos, atores e fronteiras de confiança.

- **Modelagem de ameaças** — Ativos, atores e fronteiras.
- **Validação e conteúdo não confiável** — Formato, contexto e interpretação.

### Identidade e acesso

Autenticação identifica um ator; autorização decide se ele pode executar uma ação sobre um recurso.

- **Autorização por recurso** — Permissão além da existência de uma sessão.
- **Segredos e sessões** — Armazenamento, destino e revogação.

### Dependências e operação segura

Bibliotecas, arquivos e integrações ampliam a superfície de risco.

- **Dependências e integridade** — Origem, versões e verificação.
- **IA, dados recuperados e confiança** — Prompt injection e validação de resultados.

## Sistemas Operacionais

Compreenda como o kernel gerencia processos, memória, sincronização, sistemas de arquivos e chamadas de sistema.

### História, arquitetura e kernel

Evolução dos sistemas operacionais, filosofia Unix e fronteira entre espaço de usuário e espaço de núcleo.

- **História dos sistemas operacionais e Unix** — Da execução em lote à multiprogramação, tempo compartilhado e tradição Unix.
- **Arquitetura, modo usuário e kernel** — Níveis de privilégio, interrupções, armadilhas e organização interna do núcleo.

### Processos, threads e sincronização

Representação de processos em execução, escalonamento de CPU e coordenação segura de estado compartilhado.

- **Processos, estados e escalonamento** — Bloco de controle de processo, trocas de contexto e políticas de fila de prontos.
- **Threads, exclusão mútua e sincronização** — Regiões críticas, condições de corrida, semáforos, mutexes e impasses.

### Sistemas de arquivos e chamadas de sistema

Interface de chamadas de sistema, descritores, organização de diretórios e persistência em arquivos.

- **Chamadas de sistema e interface com processos** — Passagem de parâmetros, tabela de descritores, códigos de erro e fluxo de execução.
- **Sistemas de arquivos, descritores e permissões** — Metadados (inodes), diretórios, caminhos, controle de acesso e consistência.
