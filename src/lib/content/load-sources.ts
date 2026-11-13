import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { SourceSchema } from "./source-schema";

export async function loadSources() {
  const files = (await readdir(path.join(process.cwd(), "content/sources"))).filter((file) => file.endsWith(".json")).sort();
  const sources = await Promise.all(files.map(async (file) => SourceSchema.parse(JSON.parse(await readFile(path.join(process.cwd(), "content/sources", file), "utf8")))));
  if (new Set(sources.map((source) => source.id)).size !== sources.length) throw new Error("Fonte de conteúdo duplicada.");
  return sources;
}
