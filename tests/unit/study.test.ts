import { describe, expect, it } from "vitest";
import { loadStudy } from "../../src/lib/content/load-study";
import { evaluate } from "../../src/lib/pedagogy/evaluator";
import { StudySeedSchema, type Answer, type Exercise } from "../../src/lib/study/schema";
import { publicExercise, publicLesson } from "../../src/lib/study/public";

const seed = (await loadStudy()).find((item) => item.lesson.id === "python.lacos-de-repeticao.v1")!;
function correctAnswer(exercise: Exercise): Answer {
  switch (exercise.type) {
    case "MISCONCEPTION_QUIZ": return { type: exercise.type, optionId: exercise.solution.optionId };
    case "PARSONS": return { type: exercise.type, order: exercise.solution.orders[0] };
    case "ERRONEOUS_EXAMPLE": return { type: exercise.type, itemIds: exercise.solution.faultyItemIds };
    case "PRIMM_PREDICT": return { type: exercise.type, output: exercise.solution.output };
  }
}

describe("conteúdo piloto e correção", () => {
  it("possui a distribuição de 12 exercícios alinhada aos equívocos", () => {
    const count = (type: string) => seed.exercises.filter((exercise) => exercise.type === type).length;
    expect([count("MISCONCEPTION_QUIZ"), count("PARSONS"), count("ERRONEOUS_EXAMPLE"), count("PRIMM_PREDICT")]).toEqual([4, 3, 3, 2]);
    const tags = seed.exercises.flatMap((exercise) => exercise.type === "MISCONCEPTION_QUIZ" ? exercise.options.flatMap((option) => option.misconceptionTag ?? []) : []);
    seed.lesson.misconceptions.forEach((item) => expect(tags).toContain(item.tag));
  });
  for (const exercise of seed.exercises) {
    it(`aceita a solução de ${exercise.title}`, () => expect(evaluate(exercise, correctAnswer(exercise)).isCorrect).toBe(true));
  }
  it("explica cada distrator e reprova cada alternativa incorreta", () => {
    for (const exercise of seed.exercises) {
      if (exercise.type !== "MISCONCEPTION_QUIZ") continue;
      for (const option of exercise.options.filter((item) => item.id !== exercise.solution.optionId)) {
        const result = evaluate(exercise, { type: exercise.type, optionId: option.id });
        expect(result.isCorrect).toBe(false);
        expect(result.feedback).toBe(option.feedback);
      }
    }
  });
  it("considera indentação e admite ordens equivalentes explícitas", () => {
    const original = seed.exercises.find((exercise) => exercise.type === "PARSONS")!;
    if (original.type !== "PARSONS") throw new Error("Fixture inválida");
    const wrong = structuredClone(original.solution.orders[0]);
    wrong[2].indent = 0;
    expect(evaluate(original, { type: original.type, order: wrong }).isCorrect).toBe(false);
    const alternative = structuredClone(original);
    alternative.blocks = [{ id: "a", code: "a = 1", distractor: false }, { id: "b", code: "b = 2", distractor: false }, { id: "c", code: "print(a + b)", distractor: false }];
    const equivalent = [{ id: "b", indent: 0 }, { id: "a", indent: 0 }, { id: "c", indent: 0 }];
    alternative.solution = { orders: [[{ id: "a", indent: 0 }, { id: "b", indent: 0 }, { id: "c", indent: 0 }], equivalent], output: "3" };
    expect(evaluate(alternative, { type: alternative.type, order: equivalent }).isCorrect).toBe(true);
    expect(() => evaluate(original, { type: original.type, order: [{ id: "ausente", indent: 0 }] })).toThrow();
    expect(() => evaluate(original, { type: original.type, order: [wrong[0], wrong[0]] })).toThrow();
  });
  it("corrige conjuntos de erros sem depender da ordem ou aceitar respostas parciais", () => {
    const exercise = seed.exercises.find((item) => item.type === "ERRONEOUS_EXAMPLE")!;
    if (exercise.type !== "ERRONEOUS_EXAMPLE") throw new Error("Fixture inválida");
    expect(evaluate(exercise, { type: exercise.type, itemIds: [...exercise.solution.faultyItemIds].reverse() }).isCorrect).toBe(true);
    expect(evaluate(exercise, { type: exercise.type, itemIds: exercise.solution.faultyItemIds.slice(0, 1) }).isCorrect).toBe(false);
    expect(() => evaluate(exercise, { type: exercise.type, itemIds: ["ausente"] })).toThrow();
  });
  it("normaliza apenas finais de linha e a quebra final na previsão", () => {
    const exercise = seed.exercises.find((item) => item.type === "PRIMM_PREDICT" && item.solution.output.includes("\n"))!;
    if (exercise.type !== "PRIMM_PREDICT") throw new Error("Fixture inválida");
    expect(evaluate(exercise, { type: exercise.type, output: "2\r\n1\r\n" }).isCorrect).toBe(true);
    expect(evaluate(exercise, { type: exercise.type, output: "2 1" }).isCorrect).toBe(false);
    expect(evaluate(exercise, { type: exercise.type, output: " 2\n1" }).isCorrect).toBe(false);
    expect(() => evaluate(exercise, { type: "MISCONCEPTION_QUIZ", optionId: "a" })).toThrow();
  });
  it("preserva indentação do código e rejeita gabaritos inconsistentes", () => {
    expect(seed.lesson.workedExamples[0].subgoals[2].code).toMatch(/^    total/);
    const broken = structuredClone(seed);
    const quiz = broken.exercises.find((item) => item.type === "MISCONCEPTION_QUIZ")!;
    if (quiz.type === "MISCONCEPTION_QUIZ") quiz.solution.optionId = "ausente";
    expect(StudySeedSchema.safeParse(broken).success).toBe(false);
  });
});

describe("conteúdo público", () => {
  it("remove todos os gabaritos e metadados privados antes da submissão", () => {
    for (const exercise of seed.exercises) {
      expect(JSON.stringify(publicExercise(exercise))).not.toMatch(/solution|explanation|feedback|distractor|misconceptionTag/);
    }
  });
  it("retém respostas-modelo até a resposta do aluno e, nos palpites, até o resumo", () => {
    expect(JSON.stringify(publicLesson(seed.lesson))).not.toContain("modelAnswer");
    const pre = seed.lesson.prequestions[0];
    expect(publicLesson(seed.lesson, { [pre.id]: "Palpite" }).prequestions[0].modelAnswer).toBeUndefined();
    expect(publicLesson(seed.lesson, { [pre.id]: "Palpite" }, ["summary"]).prequestions[0].modelAnswer).toBe(pre.modelAnswer);
    const self = seed.lesson.selfExplain[0];
    expect(publicLesson(seed.lesson, { [self.id]: "Explicação" }).selfExplain[0].modelAnswer).toBe(self.modelAnswer);
  });
});
