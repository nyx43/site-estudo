import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { evaluate, InvalidAnswerError } from "@/lib/pedagogy/evaluator";
import { publicExercise } from "@/lib/study/public";
import { StudySeedSchema } from "@/lib/study/schema";

function readPilot(file: string) {
  return StudySeedSchema.parse(JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "content/study", file), "utf8")));
}

const edV2 = readPilot("estruturas-pilhas-e-filas.v2.json");
const reqV2 = readPilot("requisitos-funcionais-nao-funcionais.v2.json");

describe("Etapa 2 — Avaliação estruturada, entrega aberta e sanitização pública", () => {
  it("corrige a tabela da Fila C1, aceita gabarito exato e dá diagnóstico sem vazar resposta", () => {
    const c1 = edV2.exercises.find((e) => e.id === "ed.pf.v2.c1")!;
    if (c1.type !== "STRUCTURED_RESPONSE") throw new Error("Esperado STRUCTURED_RESPONSE");

    const pubJson = JSON.stringify(publicExercise(c1));
    expect(pubJson).not.toMatch(/solution|expected|fieldFeedback|groupFeedback|Diferencie próximo|Nas duas últimas/);
    expect(publicExercise(c1).hintCount).toBe(3);

    const exactValues = Object.fromEntries(Object.entries(c1.solution.expected).map(([k, v]) => [k, v[0]]));
    expect(evaluate(c1, { type: "STRUCTURED_RESPONSE", values: exactValues }).isCorrect).toBe(true);

    const wrong = { ...exactValues, "op-4.fim": 2, "estado-final.proximo": "a" };
    const result = evaluate(c1, { type: "STRUCTURED_RESPONSE", values: wrong });
    expect(result.isCorrect).toBe(false);
    expect(result.feedback).toContain("`fim` não se altera");
    expect(result.feedback).not.toContain("saem A e B");
    expect(result.feedback).not.toContain("(2,3,1)");

    const incomplete = { ...exactValues };
    delete incomplete["op-1.inicio"];
    expect(() => evaluate(c1, { type: "STRUCTURED_RESPONSE", values: incomplete })).toThrow(InvalidAnswerError);
  });

  it("aceita interlocutores plausíveis equivalentes e nota opcional em Requisitos C1", () => {
    const c1 = reqV2.exercises.find((e) => e.id === "req.fnf.v2.c1")!;
    if (c1.type !== "STRUCTURED_RESPONSE") throw new Error("Esperado STRUCTURED_RESPONSE");

    const base = {
      "item-a.classificacao": "funcional",
      "item-a.interlocutor": "secretaria",
      "item-b.classificacao": "qualidade",
      "item-c.classificacao": "restricao",
      "item-c.interlocutor": "equipe-api",
    };
    expect(evaluate(c1, { type: "STRUCTURED_RESPONSE", values: base }).isCorrect).toBe(true);
    expect(
      evaluate(c1, {
        type: "STRUCTURED_RESPONSE",
        values: { ...base, "item-a.interlocutor": "estudantes" },
        notes: { "justificativa-interlocutores": "Estudantes usam diretamente o comprovante após matrícula." },
      }).isCorrect,
    ).toBe(true);

    const misclassified = evaluate(c1, { type: "STRUCTURED_RESPONSE", values: { ...base, "item-b.classificacao": "funcional" } });
    expect(misclassified.isCorrect).toBe(false);
    expect(misclassified.feedback).toContain("propriedade observável de acessibilidade");
  });

  it("valida estrutura de OPEN_RESPONSE sem atribuir acerto automático nem vazar rubrica/referência", () => {
    const c2 = edV2.exercises.find((e) => e.id === "ed.pf.v2.c2")!;
    if (c2.type !== "OPEN_RESPONSE") throw new Error("Esperado OPEN_RESPONSE");

    const pubJson = JSON.stringify(publicExercise(c2));
    expect(pubJson).not.toMatch(/referenceSections|criticalFailureNote|if tamanho == 0|rub-fix|Compare o estado de dois/);
    expect(pubJson).toContain("generalCriteria");

    const validOpen = evaluate(c2, {
      type: "OPEN_RESPONSE",
      fields: {
        reproducao: "Inserir A, B, C, D leva a (0,0,4) e remover falha por comparar inicio == fim.",
        "trecho-corrigido": "def remover():\n    if tamanho == 0: return 'fila vazia'",
        "testes-propostos": "Testar fila vazia, rejeição cheia sem sobrescrita e A-D remove A,B insere E,F.",
      },
    });
    expect(validOpen.isCorrect).toBe(false);
    expect(validOpen.feedback).toContain("autoavaliação");

    expect(() =>
      evaluate(c2, {
        type: "OPEN_RESPONSE",
        fields: { reproducao: "curto", "trecho-corrigido": "def r(): pass", "testes-propostos": "testes longos suficientes aqui" },
      }),
    ).toThrow(InvalidAnswerError);

    const c1 = edV2.exercises.find((e) => e.id === "ed.pf.v2.c1")!;
    if (c1.type !== "STRUCTURED_RESPONSE") throw new Error("Esperado STRUCTURED_RESPONSE");
    const collidedStruct = {
      ...c1,
      groups: [
        { id: "a.b", label: "G1", fields: [{ id: "c", label: "X", kind: "integer" as const }] },
        { id: "a", label: "G2", fields: [{ id: "b.c", label: "Y", kind: "integer" as const }] },
      ],
    };
    expect(() =>
      evaluate(collidedStruct, { type: "STRUCTURED_RESPONSE", values: { "a.b.c": 1 } }),
    ).toThrow(/Chave composta duplicada/);
  });
});
