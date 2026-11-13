import { catalog } from "@/lib/catalog";
import { createCatalogHandlers } from "@/lib/http/catalog-handlers";

export const dynamic = "force-dynamic";
export const GET = createCatalogHandlers(catalog).subjects;
