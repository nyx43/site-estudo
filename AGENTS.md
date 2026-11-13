<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Estudo ES — orientações do projeto

Leia `README.md`, `docs/ARCHITECTURE.md` e a tarefa atual. O documento mestre v2.3 é referência; instruções posteriores do usuário prevalecem. O projeto está no início e decisões podem mudar: registre o motivo e preserve dados e consumidores afetados.

## Implementação

- TypeScript estrito, sem `any` explícito ou supressão de erros para fazer uma checagem passar.
- Componentes tratam apresentação e interação. Correção, revisão e seleção pedagógica ficam em `src/lib` com testes independentes de React.
- Contratos públicos não exportam modelos Prisma, gabaritos ou notas privadas do tutor.
- Disciplinas são dados. Não adicionar listas de slugs ou páginas especiais para cadastrar novas áreas.
- Valide conteúdo com Zod e verifique referências e ciclos. Não confunda um plano `PLANNED` com aula revisada.
- Alterou schema do banco: inclua migração, seed e testes de integração correspondentes. Nunca apague dados para contornar uma migração.
- Preserve TLS, checksums e autenticação da plataforma. Não registre segredos nem coloque valores sensíveis em prompts.
- Não implementar execução de código sem isolamento apropriado.
- Evite infraestrutura para casos hipotéticos. Extraia uma abstração quando houver fronteira real ou consumidores concretos.

## Verificação e entrega

Rode `npm run check` e os percursos afetados em `npm run test:e2e`. O cliente Prisma precisa ser gerado antes da checagem de tipos. Se houver bloqueio externo, execute as verificações independentes e reporte exatamente o que não pôde ser validado; não desabilite testes nem ignore erros de build.

Atualize documentação quando comandos ou contratos mudarem. Não inicie agentes adicionais nesta fase sem autorização. Quando a colaboração começar, delimite arquivos e dependências e coordene alterações de contratos, lockfile e migrações.

Use o checkout existente em tarefas da nuvem. Não crie worktree sem pedido explícito. Não descarte mudanças locais de outras pessoas.
