import type { ExampleMode, Lesson, StudySeed } from "./schema";
import type { ExplainedExample } from "./teaching-schema";

export interface ExampleCheckItem {
  code: string;
  expectedOutput?: string;
  expectedError?: string;
  stdin?: string;
  title?: string;
}

const PLACEHOLDER_PATTERN = /\b(?:TODO|TBD|FIXME)\b|\.\.\.\s*pendente/i;

/** Retorna o modo de verificação efetivo de uma aula, preservando PYTHON_SANDBOX como padrão legado. */
export function getLessonExampleMode(lesson: Pick<Lesson, "exampleMode">): ExampleMode {
  return lesson.exampleMode ?? "PYTHON_SANDBOX";
}

/** Texto introdutório sobre como ler os exemplos de uma aula conforme sua linguagem/modo. */
export function getExampleIntroText(lesson: Pick<Lesson, "exampleMode" | "exampleLanguage">): string {
  const mode = getLessonExampleMode(lesson);
  if (mode === "STATIC_CODE") {
    const language = lesson.exampleLanguage ?? "código da disciplina";
    return `Os exemplos abaixo usam ${language} para leitura e rastreamento passo a passo. Acompanhe a entrada, o efeito de cada linha e o resultado esperado sem execução automática no navegador.`;
  }
  if (mode === "CONCEPTUAL_ARTIFACT") {
    return "Os blocos abaixo apresentam especificações, fluxos e critérios estruturados linha a linha. Acompanhe o contexto, o efeito de cada cláusula e o resultado esperado da análise.";
  }
  return "Os exemplos atuais são programas independentes em Python 3. Acompanhe a entrada, o estado de cada linha e a saída esperada. A página não executa seu código.";
}

/** Texto exibido quando uma aula não declara pré-requisitos formais. */
export function getLessonEntryIntroText(lesson: Pick<Lesson, "exampleMode">): string {
  if (getLessonExampleMode(lesson) === "PYTHON_SANDBOX") {
    return "Esta é uma aula de entrada. Não pressupõe experiência anterior com programação.";
  }
  return "Esta é uma aula introdutória do módulo e define seus termos antes de analisar os exemplos.";
}

/** Reúne todos os exemplos e respostas estruturadas de uma aula para inspeção ou sandbox. */
export function collectSeedExamples(seed: StudySeed): ExampleCheckItem[] {
  const { lesson } = seed;
  const teaching = lesson.teaching;
  const explained: ExplainedExample[] = teaching
    ? [
        ...teaching.commands.flatMap((command) => command.examples),
        ...teaching.walkthroughs,
        ...teaching.edgeCases.map((item) => item.example),
        ...teaching.aiReview.flatMap((item) => [item.generated, item.correction]),
      ]
    : [];

  return [
    { title: `${lesson.id}:concept`, code: lesson.concept.code, expectedOutput: lesson.concept.expectedOutput },
    ...lesson.workedExamples.map((example, index) => ({
      title: `${lesson.id}:worked-${index + 1}`,
      code: example.subgoals.map((subgoal) => subgoal.code).join("\n"),
      expectedOutput: example.expectedOutput,
    })),
    { title: `${lesson.id}:efficiency-naive`, code: lesson.efficiency.naive, expectedOutput: lesson.efficiency.expectedOutput },
    { title: `${lesson.id}:efficiency-better`, code: lesson.efficiency.better, expectedOutput: lesson.efficiency.expectedOutput },
    ...seed.exercises.flatMap((exercise) => {
      if (exercise.type === "PRIMM_PREDICT") {
        return [{ title: `${lesson.id}:exercise:${exercise.id}`, code: exercise.code, expectedOutput: exercise.solution.output }];
      }
      if (exercise.type === "PARSONS") {
        return exercise.solution.orders.map((order, orderIndex) => ({
          title: `${lesson.id}:exercise:${exercise.id}:${orderIndex + 1}`,
          code: order
            .map((block) => `${"    ".repeat(block.indent)}${exercise.blocks.find((item) => item.id === block.id)!.code}`)
            .join("\n"),
          expectedOutput: exercise.solution.output,
        }));
      }
      return [];
    }),
    ...explained,
  ];
}

function validateEmbeddedJsonBodies(text: string, label: string): void {
  const sections = text.split(/\r?\n\r?\n/);
  let expectJsonNext = false;

  for (const section of sections) {
    const trimmed = section.trim();
    if (!trimmed) continue;

    const startsAsJson = trimmed.startsWith("{") || trimmed.startsWith("[");
    if (startsAsJson || expectJsonNext) {
      try {
        JSON.parse(trimmed);
      } catch (cause) {
        throw new Error(`Bloco JSON inválido em ${label}.`, { cause });
      }
      expectJsonNext = false;
      continue;
    }

    expectJsonNext = /content-type\s*:\s*application\/json/i.test(trimmed);
  }
}

function validateBalancedDelimiters(text: string, label: string, language: string): void {
  const pairs: Record<string, string> = { "(": ")", "[": "]", "{": "}" };
  const closing = new Set(Object.values(pairs));
  const supportsDashComment = /\bsql\b/.test(language);
  const supportsSlashLineComment = /\b(?:java|javascript|typescript|jsx|tsx)\b/.test(language);
  const supportsBlockComment = supportsDashComment || supportsSlashLineComment;
  const stack: string[] = [];
  let quote: '"' | "'" | "`" | null = null;
  let escaped = false;
  let commentMode: "line" | "block" | null = null;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];

    if (commentMode === "line") {
      if (ch === "\n") commentMode = null;
      continue;
    }
    if (commentMode === "block") {
      if (ch === "*" && next === "/") {
        commentMode = null;
        i += 1;
      }
      continue;
    }

    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === quote) {
        quote = null;
      }
      continue;
    }

    if (supportsDashComment && ch === "-" && next === "-") {
      commentMode = "line";
      i += 1;
      continue;
    }
    if (supportsSlashLineComment && ch === "/" && next === "/" && text[i - 1] !== ":") {
      commentMode = "line";
      i += 1;
      continue;
    }
    if (supportsBlockComment && ch === "/" && next === "*") {
      commentMode = "block";
      i += 1;
      continue;
    }

    if (ch === '"' || ch === "'" || ch === "`") {
      quote = ch;
      continue;
    }
    if (pairs[ch]) {
      stack.push(pairs[ch]);
    } else if (closing.has(ch)) {
      if (stack.pop() !== ch) {
        throw new Error(`Delimitadores desbalanceados em ${label}.`);
      }
    }
  }
  if (commentMode === "block" || quote || stack.length > 0) {
    throw new Error(`Delimitadores ou aspas não fechados em ${label}.`);
  }
}

/** Verifica estruturalmente uma aula não executada em Python 3, sem simular execução em sandbox Python. */
export function verifyNonPythonSeed(seed: StudySeed): { checkedCount: number } {
  const mode = getLessonExampleMode(seed.lesson);
  if (mode === "PYTHON_SANDBOX") {
    throw new Error(`Aula ${seed.lesson.id} usa PYTHON_SANDBOX e deve ser executada na sandbox bubblewrap.`);
  }

  const { lesson } = seed;
  if (lesson.efficiency.naive.trim() === lesson.efficiency.better.trim()) {
    throw new Error(`Aula ${lesson.id} precisa diferenciar versão de referência e alternativa em efficiency.`);
  }

  for (const review of lesson.teaching?.aiReview ?? []) {
    if (review.generated.code.trim() === review.correction.code.trim()) {
      throw new Error(`Revisão de IA "${review.title}" em ${lesson.id} precisa apresentar código distinto da correção.`);
    }
    if (
      review.generated.expectedOutput === review.correction.expectedOutput &&
      review.generated.expectedError === review.correction.expectedError
    ) {
      throw new Error(`Revisão de IA "${review.title}" em ${lesson.id} precisa diferenciar resultado da falha e da correção.`);
    }
  }

  const items = collectSeedExamples(seed);
  if (!items.length) {
    throw new Error(`Aula ${lesson.id} não possui artefatos verificáveis.`);
  }

  const language = (lesson.exampleLanguage ?? "").toLowerCase();
  const checkJson = /\b(?:http|json|rest|fetch)\b/.test(language);
  const checkDelimiters = mode === "STATIC_CODE" && /\b(?:sql|java|javascript|typescript|jsx|json)\b/.test(language);

  for (const item of items) {
    const label = item.title ?? lesson.id;
    const expectedText = item.expectedOutput ?? item.expectedError ?? "";
    if (!item.code.trim() || !expectedText.trim()) {
      throw new Error(`Artefato incompleto em ${label}: código e resultado esperado são obrigatórios.`);
    }
    if (PLACEHOLDER_PATTERN.test(item.code) || PLACEHOLDER_PATTERN.test(expectedText)) {
      throw new Error(`Marcador provisório proibido detectado em ${label}.`);
    }
    if (checkJson) {
      validateEmbeddedJsonBodies(item.code, `${label} (entrada/código)`);
      validateEmbeddedJsonBodies(expectedText, `${label} (resultado esperado)`);
    }
    if (checkDelimiters) {
      validateBalancedDelimiters(item.code, `${label} (entrada/código)`, language);
      validateBalancedDelimiters(expectedText, `${label} (resultado esperado)`, language);
    }
  }

  return { checkedCount: items.length };
}
