import { catalog } from "@/lib/catalog";
import { createCatalogHandlers } from "@/lib/http/catalog-handlers";

export const dynamic = "force-dynamic";
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return createCatalogHandlers(catalog).topic(id);
}
