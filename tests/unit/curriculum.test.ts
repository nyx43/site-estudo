import { describe, expect, it } from "vitest";
import { SubjectSchema, validateCurriculum } from "../../src/lib/catalog/schema";
import { loadCurriculum } from "../../src/lib/content/load-curriculum";

describe("currículo", () => {
  it("valida o conteúdo real, incluindo relações entre os 47 tópicos", async () => {
    const subjects = await loadCurriculum();
    expect(subjects).toHaveLength(5);
    expect(subjects.flatMap((subject) => subject.modules)).toHaveLength(15);
    expect(subjects.flatMap((subject) => subject.modules.flatMap((item) => item.topics))).toHaveLength(47);
  });

  it("aceita uma disciplina adicional sem alterar contratos ou componentes", async () => {
    const subjects = await loadCurriculum();
    const extra = structuredClone(subjects[0]);
    extra.slug = "banco-de-dados";
    extra.name = "Banco de Dados";
    for (const item of extra.modules) for (const topic of item.topics) topic.plan.prerequisites = [];
    expect(validateCurriculum([...subjects, extra])).toHaveLength(6);
  });

  it("permite pré-requisitos entre disciplinas sem depender da ordem dos arquivos", async () => {
    const subjects = await loadCurriculum();
    subjects[0].modules[0].topics[0].plan.prerequisites = ["java.tipos-e-referencias"];
    expect(validateCurriculum(subjects)).toHaveLength(5);
  });

  it("rejeita um objetivo ausente", async () => {
    const [subject] = await loadCurriculum();
    subject.modules[0].topics[0].plan.objectives = [];
    expect(SubjectSchema.safeParse(subject).success).toBe(false);
  });

  it("rejeita conteúdo inesperado no contrato público", async () => {
    const [subject] = await loadCurriculum();
    expect(SubjectSchema.safeParse({ ...subject, solutionJson: "privado" }).success).toBe(false);
  });

  it("rejeita referências inexistentes", async () => {
    const subjects = await loadCurriculum();
    subjects[0].modules[0].topics[0].plan.prerequisites = ["ausente.topico"];
    expect(() => validateCurriculum(subjects)).toThrow("Pré-requisito inexistente");
  });

  it("rejeita ciclos entre disciplinas", async () => {
    const subjects = await loadCurriculum();
    const first = subjects[0].modules[0].topics[0];
    const second = subjects[1].modules[0].topics[0];
    first.plan.prerequisites = [`${subjects[1].slug}.${second.slug}`];
    second.plan.prerequisites = [`${subjects[0].slug}.${first.slug}`];
    expect(() => validateCurriculum(subjects)).toThrow("Ciclo");
  });

  it("rejeita auto-referência", async () => {
    const subjects = await loadCurriculum();
    const topic = subjects[0].modules[0].topics[0];
    topic.plan.prerequisites = [`${subjects[0].slug}.${topic.slug}`];
    expect(() => validateCurriculum(subjects)).toThrow("Ciclo");
  });

  it("rejeita disciplinas, módulos, tópicos e pré-requisitos duplicados", async () => {
    const subjects = await loadCurriculum();
    expect(() => validateCurriculum([...subjects, subjects[0]])).toThrow("Disciplina duplicada");
    const duplicateModule = structuredClone(subjects);
    duplicateModule[0].modules.push(structuredClone(duplicateModule[0].modules[0]));
    expect(() => validateCurriculum(duplicateModule)).toThrow("Módulo duplicado");
    const duplicateTopic = structuredClone(subjects);
    duplicateTopic[0].modules[1].topics.push(structuredClone(duplicateTopic[0].modules[0].topics[0]));
    expect(() => validateCurriculum(duplicateTopic)).toThrow("Tópico duplicado");
    const duplicatePrerequisite = structuredClone(subjects);
    duplicatePrerequisite[0].modules[0].topics[1].plan.prerequisites = ["python.variaveis-e-tipos", "python.variaveis-e-tipos"];
    expect(() => validateCurriculum(duplicatePrerequisite)).toThrow("Pré-requisito duplicado");
  });
});
