import { MAX_OPEN_FIELD_LENGTH, type Answer, type Exercise } from "../study/schema";

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
  } else if (exercise.type === "STRUCTURED_RESPONSE" && answer.type === exercise.type) {
    const fieldMap = new Map<string, { groupId: string; groupLabel: string; field: (typeof exercise.groups)[number]["fields"][number] }>();
    for (const group of exercise.groups) {
      for (const field of group.fields) {
        const compositeKey = `${group.id}.${field.id}`;
        if (fieldMap.has(compositeKey)) throw new InvalidAnswerError(`Chave composta duplicada: ${compositeKey}.`);
        fieldMap.set(compositeKey, { groupId: group.id, groupLabel: group.label, field });
      }
    }
    const providedKeys = Object.keys(answer.values);
    if (providedKeys.some((key) => !fieldMap.has(key))) throw new InvalidAnswerError("A resposta contém campos desconhecidos.");
    if (providedKeys.length !== fieldMap.size) throw new InvalidAnswerError("Preencha todos os campos da atividade antes de enviar.");
    for (const [key, info] of fieldMap.entries()) {
      const value = answer.values[key];
      if (info.field.kind === "integer") {
        if (typeof value !== "number" || !Number.isInteger(value)) throw new InvalidAnswerError(`Informe um número inteiro em "${info.groupLabel} — ${info.field.label}".`);
        if ((info.field.min !== undefined && value < info.field.min) || (info.field.max !== undefined && value > info.field.max)) {
          throw new InvalidAnswerError(`Valor fora do intervalo esperado em "${info.groupLabel} — ${info.field.label}".`);
        }
      } else {
        if (typeof value !== "string" || !info.field.options.some((opt) => opt.value === value)) {
          throw new InvalidAnswerError(`Escolha uma opção válida em "${info.groupLabel} — ${info.field.label}".`);
        }
      }
    }
    const allowedNoteIds = new Set((exercise.notes ?? []).map((note) => note.id));
    if (answer.notes && Object.keys(answer.notes).some((id) => !allowedNoteIds.has(id))) {
      throw new InvalidAnswerError("Nota reflexiva referencia um campo inexistente.");
    }
    const wrongKeys: string[] = [];
    const wrongGroupIds = new Set<string>();
    const wrongGroupLabels: string[] = [];
    for (const [key, accepted] of Object.entries(exercise.solution.expected)) {
      if (!accepted.some((candidate) => candidate === answer.values[key])) {
        wrongKeys.push(key);
        const info = fieldMap.get(key)!;
        if (!wrongGroupIds.has(info.groupId)) {
          wrongGroupIds.add(info.groupId);
          wrongGroupLabels.push(info.groupLabel);
        }
      }
    }
    isCorrect = wrongKeys.length === 0;
    if (isCorrect) {
      feedback = answer.notes && Object.values(answer.notes).some((v) => v.trim().length > 0)
        ? "Todos os campos e classificações conferem com o esperado. Sua nota reflexiva foi salva."
        : "Todos os campos e classificações conferem com o esperado.";
    } else {
      const diagnostics: string[] = [];
      for (const key of wrongKeys) {
        const msg = exercise.solution.fieldFeedback?.[key];
        if (msg && !diagnostics.includes(msg)) diagnostics.push(msg);
      }
      for (const groupId of wrongGroupIds) {
        const msg = exercise.solution.groupFeedback?.[groupId];
        if (msg && !diagnostics.includes(msg)) diagnostics.push(msg);
      }
      feedback = [
        `Revise os campos divergentes em: ${wrongGroupLabels.join("; ")}.`,
        ...diagnostics.slice(0, 3),
      ].join(" ");
    }
  } else if (exercise.type === "OPEN_RESPONSE" && answer.type === exercise.type) {
    const allowedFieldIds = new Set(exercise.fields.map((field) => field.id));
    if (Object.keys(answer.fields).some((id) => !allowedFieldIds.has(id))) {
      throw new InvalidAnswerError("A entrega aberta contém campos desconhecidos.");
    }
    for (const field of exercise.fields) {
      const text = answer.fields[field.id]?.trim() ?? "";
      const min = field.minLength ?? 1;
      const max = field.maxLength ?? MAX_OPEN_FIELD_LENGTH;
      if (text.length < min) throw new InvalidAnswerError(`Preencha o campo "${field.label}" (mínimo de ${min} caracteres).`);
      if ((answer.fields[field.id] ?? "").length > max) throw new InvalidAnswerError(`O campo "${field.label}" excede o limite de ${max} caracteres.`);
    }
    isCorrect = false;
    feedback = "Entrega registrada para autoavaliação pela rubrica. Compare sua resposta com os critérios e a referência comentada.";
  }
  return { isCorrect, feedback };
}
