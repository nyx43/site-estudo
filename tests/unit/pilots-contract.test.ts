import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  AnswerSchema,
  ExerciseSchema,
  MAX_OPEN_FIELD_LENGTH,
  MAX_OPEN_RESPONSE_FIELDS,
  MAX_SUBMIT_BODY_BYTES,
  StudySeedSchema,
} from "@/lib/study/schema";

const PILOT_FILES = [
  "content/study/estruturas-pilhas-e-filas.v2.json",
  "content/study/requisitos-funcionais-nao-funcionais.v2.json",
] as const;

function readJson(relPath: string) {
  return JSON.parse(fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8"));
}

describe("Contratos e conteúdo v2 dos pilotos", () => {
  it("preserva JSONs v1 sem injetar chaves default durante o parse", () => {
    const newOptionalKeys = new Set([
      "layerSections",
      "layer",
      "scope",
      "objective",
      "context",
      "prerequisites",
      "lessonSection",
      "allowDirectPractice",
      "hints",
      "layout",
      "generalCriteria",
      "notes",
      "codeLanguage",
      "labTopicId",
    ]);
    const studyDir = path.resolve(process.cwd(), "content/study");
    for (const file of fs.readdirSync(studyDir).filter((name) => name.endsWith(".v1.json"))) {
      const raw = JSON.parse(fs.readFileSync(path.join(studyDir, file), "utf8"));
      const parsed = StudySeedSchema.parse(raw);
      expect(Object.keys(parsed.lesson).filter((k) => newOptionalKeys.has(k))).toEqual([]);
      expect(Object.keys(parsed.lesson).sort()).toEqual(Object.keys(raw.lesson).sort());
      parsed.exercises.forEach((exercise, idx) => {
        expect(Object.keys(exercise).filter((k) => newOptionalKeys.has(k))).toEqual([]);
        expect(Object.keys(exercise).sort()).toEqual(Object.keys(raw.exercises[idx]).sort());
      });
    }
  });

  it("valida as duas definições v2, fontes e separação editorial das camadas", () => {
    const sourceDir = path.resolve(process.cwd(), "content/sources");
    const knownSources = new Set(fs.readdirSync(sourceDir).map((f) => JSON.parse(fs.readFileSync(path.join(sourceDir, f), "utf8")).id));

    for (const relPath of PILOT_FILES) {
      const raw = readJson(relPath);
      const parsed = StudySeedSchema.parse(raw);
      expect(parsed.lesson.version).toBe(2);
      expect(parsed.lesson.status).toBe("AUTO_CHECKED");
      expect(parsed.exercises.length).toBeGreaterThanOrEqual(7);
      expect(parsed.exercises.length).toBeLessThanOrEqual(10);

      const sectionLayers = new Set((parsed.lesson.layerSections ?? []).map((s) => s.layer));
      expect(sectionLayers).toEqual(new Set(["C1", "C2", "C3"]));

      for (const source of parsed.lesson.teaching?.sources ?? []) {
        expect(knownSources.has(source.sourceId)).toBe(true);
      }

      const directExercises = parsed.exercises.filter((e) => e.allowDirectPractice);
      expect(directExercises).toHaveLength(1);
      expect(directExercises[0].layer).toBe("C1");

      for (const exercise of parsed.exercises) {
        expect(exercise.lessonSection).toBeTruthy();
        if (exercise.layer === "C2" || exercise.layer === "C3") {
          expect(exercise.allowDirectPractice).not.toBe(true);
        }
      }
    }
  });

  it("mantém equivalência de notação e explicação complementar C3 na fila circular v2", () => {
    const edV2 = StudySeedSchema.parse(readJson(PILOT_FILES[0]));
    const v1Ed = StudySeedSchema.parse(readJson("content/study/estruturas-pilhas-e-filas.v1.json"));
    const v1Ids = new Set(v1Ed.exercises.map((e) => e.id));
    for (const ex of edV2.exercises) {
      expect(v1Ids.has(ex.id)).toBe(false);
    }
    const c1Section = edV2.lesson.layerSections?.find((s) => s.layer === "C1");
    expect(c1Section?.callout?.text).toMatch(/inicio.*rpos/s);
    expect(c1Section?.callout?.text).toMatch(/fim.*spos/s);
    expect(c1Section?.callout?.text).toMatch(/tamanho.*qtd/s);

    const c3Section = edV2.lesson.layerSections?.find((s) => s.layer === "C3");
    expect(c3Section?.isComplementary).toBe(true);
    expect(c3Section?.explanation.join(" ")).toContain("deque");

    expect(edV2.exercises.some((e) => e.title.includes("Ambiguidade entre cheia e vazia"))).toBe(false);
  });

  it("rejeita campos extras ou gabarito inconsistente em STRUCTURED_RESPONSE e OPEN_RESPONSE", () => {
    const edV2 = readJson(PILOT_FILES[0]);
    const c1 = structuredClone(edV2.exercises.find((e: { type: string }) => e.type === "STRUCTURED_RESPONSE"));
    delete c1.solution.expected["op-1.inicio"];
    expect(() => ExerciseSchema.parse(c1)).toThrow();

    const c2 = structuredClone(edV2.exercises.find((e: { type: string }) => e.type === "OPEN_RESPONSE"));
    c2.rubric.push({ ...c2.rubric[0] });
    expect(() => ExerciseSchema.parse(c2)).toThrow();
  });

  it("rejeita colisão de chave composta entre grupos e mantém limite de corpo alinhado com OPEN_RESPONSE", () => {
    const edV2 = readJson(PILOT_FILES[0]);
    const collided = structuredClone(edV2.exercises.find((e: { type: string }) => e.type === "STRUCTURED_RESPONSE"));
    collided.groups = [
      { id: "a.b", label: "Grupo 1", fields: [{ id: "c", label: "Campo", kind: "integer", min: -1, max: 5 }] },
      { id: "a", label: "Grupo 2", fields: [{ id: "b.c", label: "Colisão", kind: "integer", min: -1, max: 5 }] },
    ];
    collided.solution = { expected: { "a.b.c": [-1] } };
    expect(() => ExerciseSchema.parse(collided)).toThrow(/chave composta duplicada/i);

    const maxOpenFields = Object.fromEntries(
      Array.from({ length: MAX_OPEN_RESPONSE_FIELDS }, (_, idx) => [`campo-${idx + 1}`, "x".repeat(MAX_OPEN_FIELD_LENGTH)]),
    );
    const maxPayload = JSON.stringify({
      requestId: "00000000-0000-4000-8000-000000000099",
      answer: AnswerSchema.parse({ type: "OPEN_RESPONSE", fields: maxOpenFields }),
    });
    expect(Buffer.byteLength(maxPayload, "utf8")).toBeLessThanOrEqual(MAX_SUBMIT_BODY_BYTES);

    expect(() =>
      AnswerSchema.parse({
        type: "OPEN_RESPONSE",
        fields: { ...maxOpenFields, "campo-extra": "excede" },
      }),
    ).toThrow();
  });
});
