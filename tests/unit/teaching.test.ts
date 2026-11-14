import { describe, expect, it } from "vitest";
import { loadStudy, validateStudyLinks } from "../../src/lib/content/load-study";
import { loadCurriculum } from "../../src/lib/content/load-curriculum";
import { loadSources } from "../../src/lib/content/load-sources";
import { SourceSchema } from "../../src/lib/content/source-schema";
import { ExplainedExampleSchema } from "../../src/lib/study/teaching-schema";
import { publicLesson } from "../../src/lib/study/public";
import { orderLessons } from "../../src/lib/study/catalog";

const seeds = await loadStudy();
const latestByTopic = new Map<string, (typeof seeds)[number]>();
for (const seed of seeds) {
  if (!seed.lesson.teaching) continue;
  const previous = latestByTopic.get(seed.lesson.topicId);
  if (!previous || previous.lesson.version < seed.lesson.version) {
    latestByTopic.set(seed.lesson.topicId, seed);
  }
}
const current = [...latestByTopic.values()];
const sourceIds = new Set((await loadSources()).map((source) => source.id));
const topicIds = new Set((await loadCurriculum()).flatMap((subject) => subject.modules.flatMap((item) => item.topics.map((topic) => `${subject.slug}.${topic.slug}`))));
const example = current[0].lesson.teaching!.commands[0].examples[0];

describe("autoria aprofundada", () => {
  it("mantém aulas aprofundadas de Python e integra as seis primeiras aulas do período 26.2", () => {
    const topicIds = current.map((seed) => seed.lesson.topicId).sort();
    const pythonTopics = ["python.condicionais", "python.lacos-de-repeticao", "python.listas-e-dicionarios", "python.variaveis-e-tipos"];
    const phase3Topics = [
      "algoritmos.complexidade",
      "banco-de-dados.modelo-relacional",
      "estruturas-de-dados.pilhas-e-filas",
      "requisitos.funcionais-e-nao-funcionais",
      "sistemas-operacionais.modo-usuario-e-kernel",
      "web-dev.http-e-rest",
    ];
    expect(topicIds).toEqual([...pythonTopics, ...phase3Topics].sort());
    expect(seeds).toHaveLength(13);
    expect(seeds.some((seed) => seed.lesson.id === "python.lacos-de-repeticao.v1")).toBe(true);
    expect(seeds.some((seed) => seed.lesson.id === "estruturas-de-dados.pilhas-e-filas.v2")).toBe(true);
    expect(seeds.some((seed) => seed.lesson.id === "requisitos.funcionais-e-nao-funcionais.v2")).toBe(true);
    expect(sourceIds).toContain("python-collections-deque");
    const pythonCurrent = current.filter((seed) => seed.lesson.topicId.startsWith("python."));
    expect(pythonCurrent.flatMap((seed) => seed.exercises)).toHaveLength(32);
    expect(current.flatMap((seed) => seed.exercises)).toHaveLength(71);
    expect(current.find((seed) => seed.lesson.topicId === "web-dev.http-e-rest")?.lesson.exampleMode).toBe("STATIC_CODE");
    expect(current.find((seed) => seed.lesson.topicId === "banco-de-dados.modelo-relacional")?.lesson.exampleMode).toBe("STATIC_CODE");
    expect(current.find((seed) => seed.lesson.topicId === "requisitos.funcionais-e-nao-funcionais")?.lesson.exampleMode).toBe("CONCEPTUAL_ARTIFACT");
    expect(current.find((seed) => seed.lesson.topicId === "sistemas-operacionais.modo-usuario-e-kernel")?.lesson.exampleMode).toBe("CONCEPTUAL_ARTIFACT");
  });
  it("exige explicação de toda linha não vazia e referências válidas", () => {
    expect(ExplainedExampleSchema.safeParse({ ...example, lineNotes: example.lineNotes.slice(1) }).success).toBe(false);
    expect(ExplainedExampleSchema.safeParse({ ...example, lineNotes: [...example.lineNotes, { line: 999, explanation: "Linha inexistente" }] }).success).toBe(false);
    expect(ExplainedExampleSchema.safeParse({ ...example, lineNotes: [...example.lineNotes, example.lineNotes[0]] }).success).toBe(false);
  });
  it("distingue saída correta de um erro intencional e suporta entrada simulada", () => {
    expect(ExplainedExampleSchema.safeParse({ ...example, expectedError: "ValueError" }).success).toBe(false);
    const { expectedOutput: ignored, ...withoutResult } = example;
    void ignored;
    expect(ExplainedExampleSchema.safeParse(withoutResult).success).toBe(false);
    expect(current.some((seed) => seed.lesson.teaching!.commands.some((command) => command.examples.some((item) => item.stdin === "20\n")))).toBe(true);
    expect(current.some((seed) => seed.lesson.teaching!.edgeCases.some((item) => item.example.expectedError === "ValueError"))).toBe(true);
  });
  it("rejeita fontes e conexões de conteúdo que não foram cadastradas", () => {
    const missingSource = structuredClone(current[0]);
    missingSource.lesson.teaching!.sources[0].sourceId = "livro-inexistente";
    expect(() => validateStudyLinks([missingSource], topicIds, sourceIds)).toThrow("Fonte inexistente");
    const missingTopic = structuredClone(current[0]);
    missingTopic.lesson.teaching!.prerequisites = [{ topicId: "disciplina.ausente", reason: "Teste" }];
    expect(() => validateStudyLinks([missingTopic], topicIds, sourceIds)).toThrow("Conexão ou pré-requisito inexistente");
  });
  it("exige profundidade na versão atual e rejeita versões duplicadas", () => {
    const legacy = seeds.find((seed) => seed.lesson.id === "python.lacos-de-repeticao.v1")!;
    expect(() => validateStudyLinks([legacy], topicIds, sourceIds)).toThrow("conteúdo aprofundado");
    const duplicate = structuredClone(current[0]);
    duplicate.lesson.id += ".duplicada";
    duplicate.exercises = duplicate.exercises.map((exercise) => ({ ...exercise, id: exercise.id + ".duplicado", lessonId: duplicate.lesson.id }));
    expect(() => validateStudyLinks([current[0], duplicate], topicIds, sourceIds)).toThrow("Versão de aula duplicada");
  });
  it("não aceita conteúdo bruto ou caminho local no cadastro público de fontes", () => {
    const source = { id: "livro-exemplo", title: "Livro de exemplo", kind: "TEXTBOOK", author: "Autoria não identificada", note: "Referência para futura autoria." };
    expect(SourceSchema.safeParse(source).success).toBe(true);
    expect(SourceSchema.safeParse({ ...source, rawContent: "Capítulo inteiro" }).success).toBe(false);
    expect(SourceSchema.safeParse({ ...source, url: "file:///workspace/materials/livro.pdf" }).success).toBe(false);
    expect(SourceSchema.safeParse({ ...source, url: "javascript:alert(1)" }).success).toBe(false);
  });
  it("publica exemplos resolvidos sem liberar respostas-modelo das perguntas", () => {
    for (const seed of current) {
      const view = publicLesson(seed.lesson);
      expect(view.teaching?.commands.length).toBeGreaterThan(0);
      expect(JSON.stringify(view)).not.toContain("modelAnswer");
      expect(view.teaching?.aiReview[0].correction.code).toBeTruthy();
    }
  });
  it("ordena aulas pelo currículo, sem confundir versão com pré-requisito", () => {
    const lessons = [{ topicId: "python.lacos-de-repeticao", version: 2 }, { topicId: "python.variaveis-e-tipos", version: 1 }, { topicId: "python.condicionais", version: 1 }];
    const ordered = orderLessons(lessons, ["python.variaveis-e-tipos", "python.condicionais", "python.lacos-de-repeticao"]);
    expect(ordered.map((item) => item.topicId)).toEqual(["python.variaveis-e-tipos", "python.condicionais", "python.lacos-de-repeticao"]);
    expect(lessons[0].version).toBe(2);
  });
});
