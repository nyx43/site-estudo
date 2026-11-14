import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { LabDefinitionSchema, type LabDefinition } from "@/lib/lab/schema";

const DEFAULT_LABS_DIR = path.join(process.cwd(), "content", "labs");

/** Carrega e valida as definições de laboratórios práticos em content/labs/*.json. */
export async function loadLabs(dir = DEFAULT_LABS_DIR): Promise<LabDefinition[]> {
  let entries: string[];
  try {
    entries = await readdir(/*turbopackIgnore: true*/ dir);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }

  const files = entries.filter((name) => name.endsWith(".json")).sort();
  const labs: LabDefinition[] = [];
  const seenIds = new Set<string>();
  const seenTopics = new Set<string>();

  for (const file of files) {
    const raw = await readFile(path.join(/*turbopackIgnore: true*/ dir, file), "utf8");
    const lab = LabDefinitionSchema.parse(JSON.parse(raw));
    if (seenIds.has(lab.id)) {
      throw new Error(`ID de laboratório duplicado: ${lab.id} (${file}).`);
    }
    if (seenTopics.has(lab.topicId)) {
      throw new Error(`Tópico com mais de um laboratório definido: ${lab.topicId} (${file}).`);
    }
    seenIds.add(lab.id);
    seenTopics.add(lab.topicId);
    labs.push(lab);
  }

  return labs;
}

/** Busca a definição do laboratório associado a um topicId, ou null se não houver. */
export async function loadLabByTopic(topicId: string, dir = DEFAULT_LABS_DIR): Promise<LabDefinition | null> {
  const labs = await loadLabs(dir);
  return labs.find((lab) => lab.topicId === topicId) ?? null;
}

/** Garante que cada laboratório referencia um tópico existente no currículo. */
export function validateLabLinks(labs: LabDefinition[], topicIds: Set<string>): void {
  for (const lab of labs) {
    if (!topicIds.has(lab.topicId)) {
      throw new Error(`Laboratório ${lab.id} referencia tópico inexistente no currículo: ${lab.topicId}.`);
    }
  }
}
