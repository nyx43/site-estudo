import type { Answer, Exercise } from "../study/schema";

export class InvalidAnswerError extends Error {}
const normalizeOutput = (value: string) => value.replace(/\r\n/g, "\n").replace(/\n$/, "");

/** Pure correction: no model call, execution of submitted code, or framework dependency. */
export function evaluate(exercise: Exercise, answer: Answer): { isCorrect: boolean; feedback: string } {
  if (exercise.type !== answer.type) throw new InvalidAnswerError("O tipo de resposta não corresponde ao exercício.");
  let isCorrect = false;
  let feedback = "Ainda não. Reveja o raciocínio e tente outra vez.";
  if (exercise.type === "MISCONCEPTION_QUIZ" && answer.type === exercise.type) {
    const selected = exercise.options.find((option) => option.id === answer.optionId);
    if (!selected) throw new InvalidAnswerError("Alternativa inexistente.");
    isCorrect = answer.optionId === exercise.solution.optionId;
    feedback = selected.feedback;
  } else if (exercise.type === "PARSONS" && answer.type === exercise.type) {
    const ids = answer.order.map((block) => block.id);
    if (new Set(ids).size !== ids.length || ids.some((id) => !exercise.blocks.some((block) => block.id === id))) throw new InvalidAnswerError("Blocos inexistentes ou repetidos.");
    isCorrect = exercise.solution.orders.some((candidate) => candidate.length === answer.order.length && candidate.every((block, index) => block.id === answer.order[index].id && block.indent === answer.order[index].indent));
    feedback = isCorrect ? "A ordem e a indentação preservam o algoritmo." : "Confira a ordem, a indentação e se algum bloco está sobrando.";
  } else if (exercise.type === "ERRONEOUS_EXAMPLE" && answer.type === exercise.type) {
    if (new Set(answer.itemIds).size !== answer.itemIds.length || answer.itemIds.some((id) => !exercise.items.some((item) => item.id === id))) throw new InvalidAnswerError("Itens inexistentes ou repetidos.");
    isCorrect = JSON.stringify([...answer.itemIds].sort()) === JSON.stringify([...exercise.solution.faultyItemIds].sort());
    feedback = isCorrect ? "Você identificou todos os itens incorretos." : "Confira cada afirmação: pode haver mais de um item incorreto.";
  } else if (exercise.type === "PRIMM_PREDICT" && answer.type === exercise.type) {
    isCorrect = normalizeOutput(answer.output) === normalizeOutput(exercise.solution.output);
    feedback = isCorrect ? "A saída corresponde à execução do programa." : "Rastreie os valores a cada iteração e confira as quebras de linha.";
  }
  return { isCorrect, feedback };
}
