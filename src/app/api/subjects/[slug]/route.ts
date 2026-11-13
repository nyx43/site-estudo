import { catalog } from "@/lib/catalog";
import { createCatalogHandlers } from "@/lib/http/catalog-handlers";

export const dynamic = "force-dynamic";
export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  return createCatalogHandlers(catalog).subject(slug);
}
