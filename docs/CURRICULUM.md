# Planejamento curricular inicial

Versão 0.1: proposta de trilhas iniciais, sujeita a revisão. Não representa aulas prontas nem formação completa em cada área. As cinco disciplinas são o começo de um catálogo maior.

A fonte de verdade é `content/curriculum/*.json`; esta visão facilita a revisão. Cada tópico detalha objetivos, pré-requisitos, roteiro, equívocos, atividades e critérios de aprendizagem no JSON e na página correspondente. Projetos são propostas futuras, não atividades executáveis nesta entrega.

## Critérios editoriais

- Ensinar o conceito antes de exercitar; explicitar contexto, modelo mental e exemplos.
- Distinguir pré-requisito recomendado de bloqueio obrigatório; o catálogo não bloqueia acesso.
- Planejar atividades a partir dos objetivos e dos equívocos, com correção objetiva quando aplicável.
- Validar código em isolamento e realizar revisão humana antes de publicar aulas como verificadas.
- Expandir por módulos completos depois de validar o piloto, preservando profundidade nas cinco disciplinas.

## Python

Do primeiro raciocínio à automação: aprenda a ler, explicar e construir programas em Python.

Resultados da trilha:

- Explicar o fluxo de execução e escolher estruturas adequadas para resolver problemas.
- Construir automações pequenas, com validação de entradas e testes de comportamento.

### Fundamentos e fluxo

Valores, decisões e repetição como ferramentas para expressar um algoritmo.

- **Variáveis e tipos** — Entenda nomes, valores, conversões e operações antes de combinar instruções.
- **Condicionais** — Transforme regras em decisões com condições e caminhos alternativos.
- **Laços de repetição** — Acompanhe cada iteração, escolha entre for e while e evite erros de limite.

**Projeto futuro:** Planejar um resumo de despesas a partir de uma lista de valores fictícios.


### Dados e funções

Organize coleções e decomponha soluções com responsabilidades claras.

- **Listas e dicionários** — Escolha entre sequências e associações e percorra dados estruturados.
- **Funções** — Separe entradas, processamento e resultados sem depender de variáveis globais.
- **Escopo, mutabilidade e referências** — Rastreie nomes e objetos para entender alterações inesperadas.

**Projeto futuro:** Especificar um agrupador de gastos por categoria.


### Programas robustos

Arquivos, modelagem e testes para automações que lidam com falhas.

- **Arquivos e exceções** — Leia e grave dados com fechamento adequado e tratamento específico de erros.
- **Classes e objetos** — Modele estado e comportamento quando uma abstração justificar a classe.
- **Testes e automação** — Verifique comportamento com dados pequenos e resultados reproduzíveis.

**Projeto futuro:** Preparar um processador de CSV com dados sintéticos, inspirado no Apêndice E.

## Java

Tipos, objetos e contratos para construir programas previsíveis e bem organizados.

Resultados da trilha:

- Rastrear valores e referências e explicar contratos entre objetos.
- Modelar uma solução com coleções, exceções e testes de comportamento.

### Linguagem e execução

Fundamentos da linguagem, controle de fluxo e semântica de valores.

- **Tipos primitivos e referências** — Diferencie valores primitivos, referências, igualdade e ausência de objeto.
- **Controle de fluxo** — Expresse decisões e repetições com condições verificáveis.
- **Métodos e passagem por valor** — Entenda o que uma chamada pode modificar no chamador.

**Projeto futuro:** Planejar um classificador de inscrições com regras explícitas.


### Objetos e contratos

Invariantes, composição e polimorfismo com responsabilidades explícitas.

- **Classes e encapsulamento** — Proteja invariantes em vez de apenas expor atributos por getters e setters.
- **Herança e polimorfismo** — Reconheça substituição de tipos e quando preferir composição.
- **Interfaces** — Defina capacidades e reduza dependências de implementações concretas.

**Projeto futuro:** Modelar um catálogo de empréstimos com regras de disponibilidade.


### Coleções e qualidade

Escolha estruturas e verifique falhas sem perder segurança de tipos.

- **Coleções** — Escolha List, Set ou Map pelas operações e regras do problema.
- **Exceções e recursos** — Trate falhas no nível adequado e feche recursos com segurança.
- **Generics e testes** — Preserve tipos nas coleções e teste contratos observáveis.

**Projeto futuro:** Planejar um gerenciador de tarefas em memória.

## Ruby

Objetos, blocos e coleções com foco em leitura e intenção do código.

Resultados da trilha:

- Explicar blocos, referências e protocolos usados por coleções Ruby.
- Organizar pequenas transformações de dados com composição e testes.

### Fundamentos e blocos

Valores, controle de fluxo e funções passadas como comportamento.

- **Objetos e valores** — Reconheça objetos, referências e regras de verdade da linguagem.
- **Métodos e fluxo** — Leia retorno implícito, parâmetros e condições sem ambiguidades.
- **Blocos e iteradores** — Entenda yield, parâmetros do bloco e iteração sobre coleções.

**Projeto futuro:** Descrever um filtro de registros com regras configuráveis.


### Coleções expressivas

Chaves, valores e pipelines com semântica explícita.

- **Símbolos e strings** — Escolha representações para identificadores e textos sem conversões acidentais.
- **Hashes e arrays** — Modele sequências e associações e trate ausências de forma explícita.
- **Enumerable** — Combine seleção, transformação e redução com retorno previsível.

**Projeto futuro:** Planejar um resumo de pedidos agrupados por categoria.


### Design e testes

Organize comportamento sem dependências escondidas.

- **Classes e estado** — Modele objetos pequenos com invariantes e interfaces claras.
- **Módulos e mixins** — Compartilhe capacidades e compreenda a busca por métodos.
- **Convenções e testes** — Interprete convenções e verifique comportamento com exemplos pequenos.

**Projeto futuro:** Projetar um normalizador de registros fictícios.

## Desenvolvimento Web

Da estrutura de uma página às interações e contratos que conectam a web.

Resultados da trilha:

- Construir interfaces semânticas, responsivas e utilizáveis por teclado.
- Explicar requisições e estado assíncrono, reconhecendo riscos comuns de segurança.

### Estrutura e layout

Conteúdo semântico, fluxo visual e adaptação a telas diferentes.

- **HTML semântico** — Escolha elementos pela função e preserve uma estrutura compreensível.
- **CSS e box model** — Entenda cascata, herança e dimensões antes de ajustar layouts.
- **Flex, Grid e responsividade** — Escolha um modelo de layout e preserve legibilidade em diferentes telas.
- **Formulários e acessibilidade** — Conecte rótulos, instruções e erros a controles utilizáveis.

**Projeto futuro:** Planejar uma página de catálogo acessível.


### JavaScript e interação

Estado, eventos e assincronia no navegador.

- **JavaScript: valores e funções** — Entenda referências, funções e comparações usadas na interface.
- **DOM e eventos** — Transforme interações em alterações de estado compreensíveis.
- **Assíncrono e fetch** — Trate espera, falhas e respostas fora de ordem.
- **Estado e componentes** — Separe dados, derivação e apresentação para facilitar mudanças.

**Projeto futuro:** Planejar busca e filtros de um catálogo.


### Contratos e qualidade

Conecte cliente e servidor com validação e verificação de comportamento.

- **HTTP e REST** — Leia requisições e defina recursos, métodos e códigos de resposta.
- **Validação e segurança básica** — Reconheça fronteiras de confiança e riscos de renderização e requisições.
- **Testes de aplicações web** — Verifique regras, contratos e percursos de uso sem depender de detalhes visuais.

**Projeto futuro:** Especificar uma pequena aplicação de tarefas com API simulada.

## Análise de Requisitos

Transforme necessidades em decisões claras, critérios testáveis e escopo compreensível.

Resultados da trilha:

- Distinguir necessidade, requisito e solução e tornar afirmações verificáveis.
- Investigar, priorizar e rastrear requisitos ao longo de mudanças do projeto.

### Entender necessidades

Contexto, fontes e classificação antes de escolher uma solução.

- **Problema e stakeholders** — Identifique quem é afetado, o contexto e o resultado desejado.
- **Elicitação** — Escolha técnicas para descobrir necessidades e investigar divergências.
- **Funcionais e não funcionais** — Diferencie comportamento, qualidade e restrições de uma solução.

**Projeto futuro:** Investigar o problema de agendamento de uma biblioteca fictícia.


### Especificar e validar

Escrita clara, histórias e critérios que permitem verificar o resultado.

- **Ambiguidade e vagueza** — Encontre interpretações concorrentes e termos sem critério verificável.
- **Histórias de usuário e INVEST** — Use histórias como convite à conversa, com valor e recorte verificáveis.
- **Critérios de aceitação** — Transforme regras em exemplos que podem aprovar ou reprovar uma entrega.

**Projeto futuro:** Especificar o fluxo de reserva e cancelamento.


### Gestão e mudança

Priorize, rastreie impactos e valide alterações sem perder o objetivo.

- **Priorização e MoSCoW** — Negocie valor, risco e dependências com critérios explícitos.
- **Casos de uso** — Descreva objetivos de atores, fluxo principal e alternativas relevantes.
- **Rastreabilidade e validação** — Conecte necessidade, requisito, implementação e teste para avaliar mudanças.

**Projeto futuro:** Planejar uma mudança nas regras de reserva da biblioteca.

## Primeiro piloto

Python: Laços de repetição. Objetivos: prever saídas e diagnosticar erros de limite, reinicialização e atualização. Pré-requisito cadastrado: condicionais, que depende de variáveis e tipos. O piloto pode ser desenvolvido primeiro, mas o acesso independente pressupõe esses conhecimentos; não simular conclusão dos tópicos anteriores.

Produzir primeiro uma aula completa segundo o documento-base. Depois, 4 quizzes, 3 Parsons, 3 exemplos com erro e 2 previsões. Uma revisão posterior verifica clareza, fatos, gabaritos e alinhamento entre objetivos e atividades. As aulas anteriores deverão ser produzidas para que a trilha seja apropriada a um iniciante sem pré-requisitos.

## Referências e limites

O plano parte do Documento Mestre v2.3 fornecido pelo usuário e incorpora módulos e a futura expansão mobile discutidos nesta conversa. Não reproduz integralmente o PDF. Alegações de eficácia científica não foram verificadas nesta implementação; não apresentar o plano como avaliação científica nem inferir domínio a partir da mera leitura de uma aula.

## Estado do piloto

A aula de laços e seus 12 exercícios estão implementados como piloto em revisão. Os exemplos de código passaram pela verificação isolada; isso não substitui revisão humana da aula. As demais entradas deste documento continuam sendo planos curriculares.
