---
trigger: always_on
description: "Fluxo obrigatório pós-tarefa de programação da plataforma Estudo ES (revisão, Context7, testes, Chrome DevTools, CodeRabbit, commit seletivo, autorização de push e sigilo de credenciais)."
---

# Fluxo de desenvolvimento — Estudo ES

Ao concluir qualquer tarefa de programação neste projeto, siga este fluxo em ordem antes de encerrar (sem sobrescrever ou contrariar as diretrizes de `AGENTS.md` e `proxima ordem.md`, salvo instrução explícita em contrário do usuário):

## 1. Revisar as alterações realizadas

- Inspecione `git status` e `git diff` (staged e unstaged) para revisar cada arquivo alterado.
- Confirme aderência às regras do projeto em `AGENTS.md`: TypeScript estrito (sem `any` explícito nem supressão de erros), separação entre UI e lógica em `src/lib`, contratos públicos sem gabaritos/notas privadas e preservação integral de `data/estudo.db` e do histórico de aulas/progresso.

## 2. Consultar documentação via Context7

- Sempre que precisar verificar sintaxe, APIs, breaking changes ou boas práticas de bibliotecas do projeto (como Next.js, React, Drizzle ORM, Zod, Vitest, Playwright ou Tailwind CSS), consulte o MCP `context7` (`resolve-library-id` seguido de `query-docs`), em complemento à documentação local em `node_modules/next/dist/docs/`.

## 3. Executar testes e verificações do projeto

- Rode sempre a suíte completa de integridade e build:
  - `npm run check` (executa `content:validate`, `lint`, `typecheck`, `test`, `test:db` e `build`)
- Quando a tarefa alterar aulas, currículos, exemplos Python ou sandbox/laboratório, rode também:
  - `npm run verify:examples`
- Quando a tarefa afetar rotas, interface, acessibilidade, TTS ou fluxos do navegador, rode os testes E2E (ou os specs afetados em `tests/e2e/`) usando o navegador disponível:
  - `CHROMIUM_PATH=/opt/brave-bin/brave npm run test:e2e`
- Se alterar schema do banco, inclua migração/seed e valide integridade/backup (`npm run db:backup:verify` em diretório externo ao repositório) sem apagar dados. Nunca ignore erros nem silencie testes (`SANDBOX_TESTS=skip` não deve ser usado em entregas normais).

## 4. Validar alterações de interface com Chrome DevTools

- Sempre que a mudança afetar UI, páginas (`src/app/`), componentes React, estilos (`src/app/globals.css`), TTS ou interações no cliente:
  - Inicie um servidor local apenas em loopback (ex.: `npm run dev` em `http://127.0.0.1:3000`, ou porta livre dedicada caso necessário) e use o servidor MCP `chrome-devtools` (Brave isolado) para navegar nas rotas afetadas.
  - Verifique visualmente a renderização, console sem erros, requisições de rede sem falhas inesperadas (`4xx`/`5xx`), tema claro e tema escuro, e responsividade em viewport mobile (`360px`) sem transbordamento horizontal.
  - Encerre processos temporários de servidor iniciados apenas para essa verificação antes de finalizar.

## 5. Revisar código com CodeRabbit (quando disponível)

- Verifique antes se o CLI está instalado e autenticado com `coderabbit auth status --agent`.
- Se `authenticated` for `true`, execute a revisão local com `coderabbit review --agent` (ou usando a skill `code-review` do plugin `coderabbit`) sobre as mudanças da tarefa e corrija eventuais problemas reais apontados antes do commit.
- Se não estiver autenticado ou indisponível, não tente contornar: registre explicitamente no relatório final que a revisão do CodeRabbit foi pulada por falta de autenticação (`coderabbit auth login`).

## 6. Conferir ausência de erros antes de concluir

- Só dê a tarefa por pronta após confirmar zero erros/warnings em `eslint` (`--max-warnings=0`), `tsc --noEmit`, `next build`, console/rede no Chrome DevTools (quando aplicável) e nos testes executados.
- Se houver algum bloqueio externo real, relate exatamente o que foi testado e o que não pôde ser validado.
- Atualize `proxima ordem.md` ao concluir fases ou entregas relevantes, conforme `AGENTS.md`.

## 7. Segurança e proteção de dados sensíveis

- **Nunca** leia, exponha, registre ou inclua senhas, tokens, chaves de API, arquivos `.env` (exceto `.env.example`), bancos pessoais (`data/estudo.db`), `backups/`, `materials/` ou quaisquer dados privados em código, commits, logs, mensagens ou artefatos.
- Inspecione `git status` e `git diff --cached` antes de qualquer commit para confirmar que nenhum arquivo ou valor sensível entrou no staging.

## 8. Commit seletivo e claro (somente arquivos da tarefa)

- Prepare o commit apenas com os arquivos estritamente relacionados à tarefa, adicionando-os **explicitamente** com `git add <arquivo ...>` (nunca use `git add -A` ou `git add .` sem conferir o `git status`).
- Não inclua arquivos temporários, caches, relatórios de teste, nem alterações preexistentes de outras tarefas.
- Escreva uma mensagem de commit clara e descritiva no padrão do repositório (ex.: `feat: ...`, `fix: ...`, `test: ...`, `docs: ...`, `chore: ...`).
- Antes de executar `git commit`, verifique se `git config user.name` e `git config user.email` estão definidos; caso faltem, peça confirmação/dados ao usuário em vez de inventar autoria.
- (Caso o usuário tenha solicitado explicitamente "não fazer commit" naquela tarefa, respeite a solicitação e pare no staging/revisão.)

## 9. Autorização obrigatória antes de `git push`

- **Nunca** execute `git push` (nem publique PRs/alterações no repositório remoto via `gh` ou MCP `github`) automaticamente após criar o commit.
- Após o commit local, apresente ao usuário: resumo das alterações, resultados exatos dos testes/verificações, mensagem/hash do commit criado e peça **autorização explícita** antes de rodar `git push`.
