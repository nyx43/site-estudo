# Próxima ordem — Estudo ES

Atualizado em 13/11/2026. A referência de longo prazo continua em [ordem de trabalho 26.2.md](ordem%20de%20trabalho%2026.2.md) e [docs/ROADMAP.md](docs/ROADMAP.md), prevalecendo as entregas já verificadas e as decisões registradas neste arquivo.

## Estado atual verificado

- **Período 26.2 (Nível 1) concluído e preservado (commit `d44f24a`):** as cinco matérias acadêmicas (*Complexidade de Algoritmos e Estrutura de Dados*, *Desenvolvimento de Softwares para Web*, *Engenharia de Requisitos de Softwares*, *Sistemas Operacionais* e *Gerenciamento de Banco de Dados*) aparecem como **Em desenvolvimento**, *Python* segue **Pausada** com acesso integral preservado e *APTA* permanece fora do escopo.
- **Fase atual concluída — Leitura em voz alta (TTS) por bloco (13/11/2026):** implementada e integrada nas páginas de leitura completa (`/aulas/[topicId]`) e no estudo guiado (`/estudar/[topicId]`, etapas + exercícios), preservando integralmente o catálogo 26.2, as quatro aulas existentes, a v1 histórica de *Laços de repetição*, os 44 exercícios e o banco SQLite `data/estudo.db`.

## O que foi entregue nesta fase (TTS por bloco)

1. **Núcleo puro de TTS e normalização de IDs (`src/lib/study/tts.ts`, `src/lib/study/labels.ts`):**
   - Persistência e validação de preferências locais (`voiceURI`, `rate`, `continuous`, `codeMode`) sob a chave `estudo-tts-preferences`.
   - Geração de identificadores estáveis sem acentuação (`toStableTtsId`) por aula/etapa/bloco/exercício.
   - Priorização de vozes `pt-BR` / `pt`, detecção de capacidades do navegador (`supported`, `pauseSupported`, `isLinux`) e fragmentação de trechos longos (`splitSpeechText`) em sentenças menores para evitar travamentos de sintetizadores locais no Linux.
   - Formatação dedicada para blocos de código e tabelas (`formatCodeForExplanationTts`, `formatCodeForLiteralTts` com números de linha, recuos Python e símbolos falados, e `formatTableForTts`).
   - Controlador determinístico (`createTtsController`) com guarda de sessão monotônica, cancelamento prévio ao alternar blocos (evitando sobreposição), `pause`/`resume` apenas quando suportados, modo contínuo e tratamento amigável de erros (`not-allowed`, `voice-unavailable`, etc.).
2. **Componentes reutilizáveis e integração nas aulas (`src/components/study/`):**
   - `TtsProvider` + `TtsToolbar`: barra local com **Iniciar leitura** / **Continuar** / **Pausar** (quando suportado) / **Parar**, seletores de **Voz**, **Velocidade** (`0.75x` a `2x`) e **Códigos** (`Explicação textual` / `Leitura literal`), alternador `role="switch"` de **Leitura contínua**, status `aria-live="polite"` e cancelamento automático ao mudar de etapa, exercício ou página.
   - `TtsBlock` + `CodeBlock` atualizados: cada parágrafo, glossário, comando, explicação por linha, tabela, cartão de erro/refutação, pergunta e bloco de código possui botão **Ouvir** com controles ativos **Pausar/Continuar/Parar**, destaque visual do bloco narrado (`data-tts-active="true"`, `.tts-block-active`) e alternância local **Explicação / Literal** no cabeçalho dos códigos.
   - `LessonArticleReader`, `LessonContent`, `TeachingContent`, `QuestionCard`, `ExercisePanel`, `StudyWorkspace` e `/aulas/[topicId]` integrados com compatibilidade para tema claro, `[data-theme="dark"]` e largura móvel `360px`.

## Limitações conhecidas do TTS

- **Dependência do motor local do navegador/SO:** o recurso utiliza exclusivamente a Web Speech API local, sem serviço pago ou envio remoto de texto. No Linux, a lista de vozes e o suporte a `pause()`/`resume()` variam conforme o navegador (Chromium/Brave/Firefox) e serviços do sistema (como `speech-dispatcher` / `espeak-ng`). Quando `speechSynthesis` não está disponível, quando `getVoices()` retorna vazio ou quando `pause` não é suportado, a interface exibe aviso explícito e mantém leitura e exercícios 100% utilizáveis sem áudio.
- **Qualidade prosódica em português e símbolos literais:** entonação e pronúncia dependem das vozes locais instaladas no sistema operacional. Blocos extensos são quebrados por pontuação para reduzir cortes no sintetizador local, o que pode gerar micro-pausas entre sentenças.

## Verificações e testes executados

- **`npm run check` (executado após as últimas alterações de código):**
  - `npm run content:validate`: 14 disciplinas, 52 módulos, 121 tópicos planejados; 4 aulas atuais, 32 exercícios atuais; 5 versões preservadas.
  - `npm run lint`: 0 erros e 0 avisos (`eslint . --max-warnings=0`).
  - `npm run typecheck`: `next typegen && tsc --noEmit` sem erros.
  - `npm test`: 5 arquivos, **58 testes unitários passaram** (incluindo 10 testes novos em `tests/unit/tts.test.ts`).
  - `npm run test:db`: 2 arquivos, **20 testes de integração SQLite passaram**.
  - `npm run build`: compilação de produção Next.js 16.4.6 concluída com sucesso.
- **`CHROMIUM_PATH=/opt/brave-bin/brave npm run test:e2e`:** **28 percursos E2E passaram** (14 desktop + 14 mobile em 360px, banco isolado `.cache/e2e-*.db`), cobrindo `catalog.spec.ts`, `reading.spec.ts`, `study.spec.ts`, `theme.spec.ts` e **10 cenários novos em `tests/e2e/tts.spec.ts`** com simulação da Web Speech API e cenário de indisponibilidade.
- **Revisão automatizada das 4 aulas e do estudo guiado contra `next start` (Brave em cópia temporária do banco):**
  - `/aulas/python.variaveis-e-tipos`: 118 blocos TTS únicos, 32/32 blocos de código cobertos, `scrollWidth <= innerWidth` em desktop e 360px (claro e escuro).
  - `/aulas/python.condicionais`: 115 blocos TTS únicos, 32/32 blocos de código cobertos, zero transbordamento.
  - `/aulas/python.lacos-de-repeticao`: 111 blocos TTS únicos, 29/29 blocos de código cobertos, zero transbordamento.
  - `/aulas/python.listas-e-dicionarios`: 136 blocos TTS únicos, 37/37 blocos de código cobertos, zero transbordamento.
  - `/estudar/python.lacos-de-repeticao` (v2 atual e `?version=1`): renderização íntegra sem erros de runtime (`pageErrors: []`); único 404 observado no console decorre da ausência pré-existente de `favicon.ico`.
- **Integridade do banco pessoal (`data/estudo.db`):** `PRAGMA integrity_check = ok`, `PRAGMA foreign_key_check = []`, 14 disciplinas, 52 módulos, 121 tópicos, 5 versões de aula e 44 exercícios preservados intactos.

## Pendências antes das aulas de 26.2

1. **Próxima prioridade imediata (Fase 2): Laboratório de programação Python real**, começando como piloto isolado antes de produzir lotes de novas aulas.
2. **Materiais do Google Drive (período 26.2):** os binários completos das cinco pastas continuam sem leitura local completa em checkout; leitura/extração de localizadores reais segue registrada como pendente em `docs/INVENTARIO_26_2.md` e não deve ser inventada.

## Para outra conversa ou IA

Leia `AGENTS.md`, `README.md`, `docs/ARCHITECTURE.md`, `docs/ROADMAP.md` e este arquivo antes de editar. Preserve integralmente `data/estudo.db`, o catálogo 26.2, as aulas existentes, o tema claro/escuro e o sistema de TTS por bloco. Confira `git status` e não inicie ainda produção em lote de aulas, IA generativa ou RPG.

## Comando pronto para copiar e colar para a próxima tarefa

```bash
cd -- '/home/joaovt/Área de trabalho/site estudo/site-estudo-feat-plataforma-estudos' &&
  python3 ferramentas/orq loop 'Leia AGENTS.md, README.md, docs/ARCHITECTURE.md, docs/ROADMAP.md e "proxima ordem.md". Verifique git status antes de alterar arquivos e preserve data/estudo.db, o catálogo 26.2, as aulas existentes, o tema claro/escuro e o TTS por bloco. Implemente a próxima fase: o laboratório de programação Python real (piloto inicial na aula de Laços de repetição) com editor de código acessível na interface, execução real em sandbox isolada (sem rede, sem acesso ao checkout, banco ou diretório home do usuário, com limites estritos de tempo, CPU, memória, processos e saída, além de falha fechada caso o isolamento disponível no ambiente falhe), console exibindo entrada simulada, stdout, stderr e código de saída, e suíte de testes automáticos (unitários, segurança/adversariais de isolamento e E2E) verificando execução real e proteção do ambiente. Não implemente IA generativa, RPG nem dezenas de aulas novas nesta entrega. Ao finalizar, execute npm run check e CHROMIUM_PATH=/opt/brave-bin/brave npm run test:e2e, atualize "proxima ordem.md" com entregas, testes, limitações do sandbox e próximo comando, e faça o commit das alterações.'
```
