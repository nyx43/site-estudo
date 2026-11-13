import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { validateCurriculum } from "../catalog/schema";

export async function loadCurriculum() {
  const files = (await readdir(path.join(process.cwd(), "content/curriculum"))).filter((file) => file.endsWith(".json")).sort();
  if (!files.length) throw new Error("Nenhuma disciplina encontrada no currículo.");
  const input: unknown[] = await Promise.all(files.map(async (file) => {
    try {
      return JSON.parse(await readFile(path.join(process.cwd(), "content/curriculum", file), "utf8")) as unknown;
    } catch (cause) {
      throw new Error(`Não foi possível ler ${file}`, { cause });
    }
  }));
  return validateCurriculum(input).sort((a, b) => a.orderIndex - b.orderIndex || a.slug.localeCompare(b.slug));
}
