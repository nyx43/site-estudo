import { describe, expect, it } from "vitest";
import { SubjectSchema, validateCurriculum } from "../../src/lib/catalog/schema";
import { loadCurriculum } from "../../src/lib/content/load-curriculum";

describe("currículo", () => {
  it("valida o conteúdo real, incluindo percursos até casos avançados", async () => {
    const subjects = await loadCurriculum();
    expect(subjects).toHaveLength(14);
    expect(subjects.flatMap((subject) => subject.modules)).toHaveLength(52);
    expect(subjects.flatMap((subject) => subject.modules.flatMap((item) => item.topics))).toHaveLength(121);
    expect(subjects.map((subject) => subject.slug)).not.toContain("apta");
  });

  it("organiza o período 26.2 com as cinco disciplinas acadêmicas em desenvolvimento e estados reais nas demais", async () => {
    const subjects = await loadCurriculum();
    const inProgress = subjects.filter((subject) => subject.lifecycleStatus === "IN_PROGRESS");
    const paused = subjects.filter((subject) => subject.lifecycleStatus === "PAUSED");
    const upcoming = subjects.filter((subject) => subject.lifecycleStatus === "UPCOMING");

    expect(inProgress.map((subject) => subject.slug)).toEqual([
      "web-dev",
      "requisitos",
      "algoritmos",
      "estruturas-de-dados",
      "banco-de-dados",
      "sistemas-operacionais",
    ]);
    expect(new Set(inProgress.map((subject) => subject.academicTrack?.courseName))).toEqual(
      new Set([
        "Complexidade de Algoritmos e Estrutura de Dados",
        "Desenvolvimento de Softwares para Web",
        "Engenharia de Requisitos de Softwares",
        "Sistemas Operacionais",
        "Gerenciamento de Banco de Dados",
      ]),
    );
    expect(paused.map((subject) => subject.slug)).toEqual(["python"]);
    expect(upcoming).toHaveLength(7);
    expect(subjects.every((subject) => subject.modules.every((mod) => mod.topics.every((t) => t.plan.status === "PLANNED")))).toBe(true);
  });

  it("rejeita disciplinas correlatas inexistentes, duplicadas ou auto-referenciadas", async () => {
    const subjects = await loadCurriculum();
    const missingRelated = structuredClone(subjects);
    missingRelated[0].academicTrack = {
      period: "26.2",
      courseName: "Curso Teste",
      orderIndex: 1,
      relatedSubjects: ["inexistente"],
    };
    expect(() => validateCurriculum(missingRelated)).toThrow("Disciplina correlata inexistente");

    const selfRelated = structuredClone(subjects);
    selfRelated[0].academicTrack = {
      period: "26.2",
      courseName: "Curso Teste",
      orderIndex: 1,
      relatedSubjects: [selfRelated[0].slug],
    };
    expect(() => validateCurriculum(selfRelated)).toThrow("Disciplina correlata auto-referenciada");

    const duplicateRelated = structuredClone(subjects);
    duplicateRelated[0].academicTrack = {
      period: "26.2",
      courseName: "Curso Teste",
      orderIndex: 1,
      relatedSubjects: ["java", "java"],
    };
    expect(() => validateCurriculum(duplicateRelated)).toThrow("Disciplina correlata duplicada");
  });

  it("aceita uma disciplina adicional sem alterar contratos ou componentes", async () => {
    const subjects = await loadCurriculum();
    const extra = structuredClone(subjects[0]);
    extra.slug = "disciplina-exemplo";
    extra.name = "Banco de Dados";
    for (const item of extra.modules) for (const topic of item.topics) topic.plan.prerequisites = [];
    expect(validateCurriculum([...subjects, extra])).toHaveLength(subjects.length + 1);
  });

  it("permite pré-requisitos entre disciplinas sem depender da ordem dos arquivos", async () => {
    const subjects = await loadCurriculum();
    subjects[0].modules[0].topics[0].plan.prerequisites = ["java.tipos-e-referencias"];
    expect(validateCurriculum(subjects)).toHaveLength(subjects.length);
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
