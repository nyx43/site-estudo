import { describe, expect, it, vi } from "vitest";
import { createCatalogService } from "../../src/lib/catalog/service";
import { createFileCatalogRepository } from "../../src/lib/content/catalog-repository";
import { filterSubjects } from "../../src/lib/catalog/filter";
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
  it("busca nomes e tópicos sem depender de acento ou caixa", async () => {
    const subjects = await service.listSubjects();
    expect(filterSubjects(subjects, "ANALISE", "ALL").map((item) => item.slug)).toEqual(["requisitos"]);
    expect(filterSubjects(subjects, "laços", "ALL").map((item) => item.slug)).toEqual(["python"]);
  });
  it("combina categoria e termos e aceita busca vazia", async () => {
    const subjects = await service.listSubjects();
    expect(filterSubjects(subjects, "   ", "ALL")).toHaveLength(5);
    expect(filterSubjects(subjects, "", "PROGRAMMING")).toHaveLength(4);
    expect(filterSubjects(subjects, "python", "THEORETICAL")).toHaveLength(0);
    expect(filterSubjects(subjects, "contratos segurança", "PROGRAMMING").map((item) => item.slug)).toContain("web-dev");
  });
});

describe("contrato HTTP", () => {
  const handlers = createCatalogHandlers(service);
  it("entrega envelope versionado e catálogo completo", async () => {
    const response = await handlers.subjects();
    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result.meta.version).toBe(1);
    expect(result.data).toHaveLength(5);
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
