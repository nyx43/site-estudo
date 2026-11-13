import type { createCatalogService } from "../catalog/service";

type CatalogService = ReturnType<typeof createCatalogService>;
const notFound = () => Response.json({ error: { code: "NOT_FOUND", message: "Conteúdo não encontrado." } }, { status: 404 });

async function handle<T>(operation: () => Promise<T | null>) {
  try {
    const data = await operation();
    return data === null ? notFound() : Response.json({ data, meta: { version: 1 } });
  } catch (error) {
    console.error("Falha ao consultar o catálogo:", error);
    return Response.json({ error: { code: "CATALOG_UNAVAILABLE", message: "Não foi possível carregar o catálogo. Tente novamente." } }, { status: 503 });
  }
}

export function createCatalogHandlers(service: CatalogService) {
  return {
    subjects: () => handle(() => service.listSubjects()),
    subject: (slug: string) => handle(() => service.findSubject(slug)),
    topic: (id: string) => handle(() => service.findTopic(id)),
  };
}
