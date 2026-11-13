# Próxima ordem do Estudo ES

Atualizado em 13/11/2026. Branch local `feat/plataforma-estudos`.

## O que já foi feito

- O site tem catálogo, leitura de aulas, prática guiada e progresso salvo em SQLite. O currículo planeja 13 disciplinas e 115 tópicos. Quatro aulas de Python já estão disponíveis: variáveis e tipos, condicionais, laços e listas/dicionários.
- A troca de tema claro/escuro foi implementada em outra conversa. O código e `tests/e2e/theme.spec.ts` estão no checkout como alterações locais. A última execução registrada pelo Playwright aparece como aprovada, sem identificar os cenários executados. A rodada do `orq` deixou um plano em `.ai/plan.md`.
- O `allowScripts` em `package.json` também é uma alteração local. Preserve essas mudanças ao trabalhar nas aulas.
- `npm run check` passou em 13/11/2026 no checkout atual: conteúdo, lint, tipos, 45 testes unitários, 20 testes de banco e build. O Playwright não foi reexecutado nesta atualização de documentação.

## Fila de trabalho

- [x] Implementar a troca de tema claro/escuro.
- [ ] **Próxima ordem:** entregar a primeira aula de Java, **Tipos primitivos e referências**, para o tópico `java.tipos-e-referencias`.
- [ ] Continuar o módulo inicial de Java com controle de fluxo e métodos, uma aula por ordem.
- [ ] Iniciar fundamentos de Ruby e retomar Python com funções, escopo e mutabilidade, conforme o [roadmap](docs/ROADMAP.md).

## Copie e cole no terminal

O bloco abaixo chama o Codex pelo `orq` para esta tarefa. Se ainda houver uma rodada antiga de tema esperando no terminal, encerre-a com `Ctrl+C` antes de colar.

```bash
cd -- '/home/joaovt/Área de trabalho/site estudo/site-estudo-feat-plataforma-estudos' &&
  "$HOME/.local/bin/orq" ask codex --write 'Leia AGENTS.md e "proxima ordem.md". Execute apenas a próxima ordem, a primeira aula de Java sobre tipos primitivos e referências. Use as regras e os critérios desta ordem no documento. Preserve as mudanças locais de tema e de package.json. Ao terminar, registre o resultado e a próxima ordem com um comando pronto para copiar e colar.'
```

## Escopo e critérios desta ordem

- Leia o [guia de autoria](docs/AUTHORING.md) e o plano do tópico em `content/curriculum/java.json`. Use referências reais e registre os trechos consultados. A aula deve explicar primitivos, referências, `==`, `.equals()` e `null`, com exemplos explicados linha por linha, casos de borda e exercícios alinhados aos objetivos.
- Confira o suporte a exemplos Java antes de publicar a aula. O verificador atual usa Python. Se o suporte necessário ultrapassar o escopo de uma aula, registre a dependência e proponha uma ordem específica para resolvê-la. Mantenha `DRAFT` se as verificações pertinentes estiverem pendentes. Registre a revisão humana na [fila de revisão](docs/REVIEW_QUEUE.md).
- Rode `npm run check` e os percursos e2e afetados. Registre o resultado, incluindo o que ficou bloqueado. Preserve o conteúdo e os dados existentes.

## Para continuar em outra conversa ou IA

Passe este arquivo e diga: **“Leia `proxima ordem.md` e `AGENTS.md`, confira `git status` e siga a próxima ordem.”** O arquivo `.ai/plan.md` pode pertencer a uma rodada anterior.

Ao encerrar cada tarefa, atualize este arquivo com o que foi feito, as verificações e pendências reais e um bloco de terminal para a primeira tarefa aberta. Se a tarefa ficou bloqueada, deixe o comando para retomá-la ou resolver o bloqueio. A execução da próxima ordem começa quando o usuário a pedir ou colar o comando correspondente.
