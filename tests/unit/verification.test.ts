import { describe, expect, it } from "vitest";
import { loadStudy } from "../../src/lib/content/load-study";
import {
  getExampleIntroText,
  getLessonEntryIntroText,
  getLessonExampleMode,
  verifyNonPythonSeed,
} from "../../src/lib/study/verification";

const seeds = await loadStudy();
const pythonSeed = seeds.find((seed) => seed.lesson.id === "python.variaveis-e-tipos.v1")!;
const httpSeed = seeds.find((seed) => seed.lesson.id === "web-dev.http-e-rest.v1")!;
const bdSeed = seeds.find((seed) => seed.lesson.id === "banco-de-dados.modelo-relacional.v1")!;

describe("modos de exemplo e verificação multi-linguagem", () => {
  it("mantém PYTHON_SANDBOX como padrão para aulas legadas sem exampleMode", () => {
    expect(getLessonExampleMode(pythonSeed.lesson)).toBe("PYTHON_SANDBOX");
    expect(getExampleIntroText(pythonSeed.lesson)).toContain("Python 3");
    expect(getLessonEntryIntroText(pythonSeed.lesson)).toContain("experiência anterior com programação");
  });

  it("adapta textos introdutórios para STATIC_CODE e CONCEPTUAL_ARTIFACT", () => {
    const staticText = getExampleIntroText({ exampleMode: "STATIC_CODE", exampleLanguage: "HTTP / JSON" });
    expect(staticText).toContain("HTTP / JSON");
    expect(staticText).not.toContain("Python 3");

    const conceptualText = getExampleIntroText({ exampleMode: "CONCEPTUAL_ARTIFACT" });
    expect(conceptualText).toContain("especificações");
    expect(conceptualText).not.toContain("Python 3");
    expect(getLessonEntryIntroText({ exampleMode: "CONCEPTUAL_ARTIFACT" })).not.toContain("programação");
  });

  it("recusa verifyNonPythonSeed para aulas PYTHON_SANDBOX", () => {
    expect(() => verifyNonPythonSeed(pythonSeed)).toThrow("PYTHON_SANDBOX");
  });

  it("valida estruturalmente aulas STATIC_CODE e rejeita JSON quebrado, comentários ou marcadores TODO", () => {
    const mockHttpSeed = structuredClone(httpSeed);
    expect(verifyNonPythonSeed(mockHttpSeed).checkedCount).toBeGreaterThan(0);

    const brokenJson = structuredClone(httpSeed);
    brokenJson.lesson.concept.code = 'POST /api/pedidos\n\n{"id": }';
    expect(() => verifyNonPythonSeed(brokenJson)).toThrow("JSON inválido");

    const truncatedJsonOutput = structuredClone(httpSeed);
    truncatedJsonOutput.lesson.concept.expectedOutput = 'HTTP/1.1 200 OK\nContent-Type: application/json\n\n{"id": 1';
    expect(() => verifyNonPythonSeed(truncatedJsonOutput)).toThrow("JSON inválido");

    const sqlSeed = structuredClone(bdSeed);
    sqlSeed.lesson.concept = {
      definition: "Consulta SQL comentada.",
      parts: ["Comentários SQL não devem quebrar delimitadores"],
      code: "SELECT 1; -- comentario com apostrofo ' e parentese (\nSELECT ('ok'); /* bloco '(' */",
      expectedOutput: "1\nok",
    };
    expect(verifyNonPythonSeed(sqlSeed).checkedCount).toBeGreaterThan(0);

    const todoSeed = structuredClone(httpSeed);
    todoSeed.lesson.concept.expectedOutput = "TODO: preencher depois";
    expect(() => verifyNonPythonSeed(todoSeed)).toThrow("Marcador provisório");
  });
});
