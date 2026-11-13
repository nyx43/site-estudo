import { describe, expect, it, vi } from "vitest";
import { createCatalogService } from "../../src/lib/catalog/service";
import { createFileCatalogRepository } from "../../src/lib/content/catalog-repository";
import { filterSubjects, getAcademicPeriodGroups, groupSubjectsByLifecycle } from "../../src/lib/catalog/filter";
import { createCatalogHandlers } from "../../src/lib/http/catalog-handlers";
import type { CatalogRepository } from "../../src/lib/catalog/types";

const repository = createFileCatalogRepository();
const service = createCatalogService(repository);

describe("catálogo e busca", () => {
  it("encontra tópicos e preserva o contexto da disciplina e do módulo", async () => {
    const result = await service.findTopic("python.lacos-de-repeticao");
    expect(result?.subject.slug).toBe("python");
    expect(result?.module.slug).toBe("fundamentos");
    expect(result?.topic.plan.status).toBe("PLANNED");
  });
  it("retorna null para disciplina e tópico ausentes", async () => {
    expect(await service.findSubject("ausente")).toBeNull();
    expect(await service.findTopic("ausente.topico")).toBeNull();
  });
  it("busca nomes, nomes acadêmicos 26.2 e tópicos sem depender de acento ou caixa", async () => {
    const subjects = await service.listSubjects();
    expect(filterSubjects(subjects, "ANALISE DE REQUISITOS", "ALL").map((item) => item.slug)).toEqual(["requisitos"]);
    expect(filterSubjects(subjects, "laços", "ALL").map((item) => item.slug)).toEqual(["python"]);
    expect(filterSubjects(subjects, "Complexidade de Algoritmos e Estrutura de Dados", "ALL").map((item) => item.slug)).toEqual([
      "algoritmos",
      "estruturas-de-dados",
    ]);
    expect(filterSubjects(subjects, "Sistemas Operacionais", "ALL").map((item) => item.slug)).toEqual(["sistemas-operacionais"]);
  });
  it("combina categoria, estado de andamento e termos e aceita busca vazia", async () => {
    const subjects = await service.listSubjects();
    expect(filterSubjects(subjects, "   ", "ALL")).toHaveLength(subjects.length);
    expect(filterSubjects(subjects, "", "PROGRAMMING")).toHaveLength(subjects.filter((item) => item.category === "PROGRAMMING").length);
    expect(filterSubjects(subjects, "", "ALL", "IN_PROGRESS")).toHaveLength(6);
    expect(filterSubjects(subjects, "", "ALL", "PAUSED").map((item) => item.slug)).toEqual(["python"]);
    expect(filterSubjects(subjects, "", "ALL", "UPCOMING")).toHaveLength(7);
    expect(filterSubjects(subjects, "python", "THEORETICAL")).toHaveLength(0);
    expect(filterSubjects(subjects, "contratos segurança", "PROGRAMMING").map((item) => item.slug)).toContain("web-dev");
  });
  it("agrupa as cinco disciplinas acadêmicas do período 26.2 na ordem configurada", async () => {
    const subjects = await service.listSubjects();
    const groups = getAcademicPeriodGroups(subjects, "26.2");
    expect(groups.map((group) => group.courseName)).toEqual([
      "Complexidade de Algoritmos e Estrutura de Dados",
      "Desenvolvimento de Softwares para Web",
      "Engenharia de Requisitos de Softwares",
      "Sistemas Operacionais",
      "Gerenciamento de Banco de Dados",
    ]);
    expect(groups[0].subjects.map((item) => item.slug)).toEqual(["algoritmos", "estruturas-de-dados"]);
    expect(groups[0].relatedSubjectSlugs).toContain("python");
    const byLifecycle = groupSubjectsByLifecycle(subjects);
    expect(byLifecycle.IN_PROGRESS).toHaveLength(6);
    expect(byLifecycle.PAUSED).toHaveLength(1);
    expect(byLifecycle.UPCOMING).toHaveLength(7);
  });
});

describe("contrato HTTP", () => {
  const handlers = createCatalogHandlers(service);
  it("entrega envelope versionado e catálogo completo", async () => {
    const response = await handlers.subjects();
    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result.meta.version).toBe(1);
    expect(result.data.map((item: { slug: string }) => item.slug)).toEqual((await service.listSubjects()).map((item) => item.slug));
    expect(JSON.stringify(result)).not.toMatch(/solutionJson|tutorNotes|misconceptionTag/);
  });
  it("entrega disciplina individual e tópico pelo mesmo serviço", async () => {
    expect((await (await handlers.subject("python")).json()).data.slug).toBe("python");
    expect((await (await handlers.topic("python.lacos-de-repeticao")).json()).data.topic.title).toBe("Laços de repetição");
  });
  it("distingue recurso ausente de falha interna", async () => {
    const response = await handlers.subject("ausente");
    expect(response.status).toBe(404);
    expect((await response.json()).error.code).toBe("NOT_FOUND");
    expect((await handlers.topic("ausente.topico")).status).toBe(404);
  });
  it("retorna 503 sem expor detalhes da infraestrutura", async () => {
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const failing: CatalogRepository = {
        ...repository,
        listSubjects: async () => { throw new Error("DATABASE_URL=file:/private/internal.db"); },
      };
      const response = await createCatalogHandlers(createCatalogService(failing)).subjects();
      expect(response.status).toBe(503);
      const body = await response.text();
      expect(body).toContain("CATALOG_UNAVAILABLE");
      expect(body).not.toContain("private");
    } finally { errorLog.mockRestore(); }
  });
});
