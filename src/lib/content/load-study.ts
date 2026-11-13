import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { StudySeedSchema, type StudySeed } from "../study/schema";
import { loadCurriculum } from "./load-curriculum";
import { loadSources } from "./load-sources";

export async function loadStudy() {
  const filenames = (await readdir(path.join(process.cwd(), "content/study"))).filter((file) => file.endsWith(".json")).sort();
  const seeds = await Promise.all(filenames.map(async (file) => StudySeedSchema.parse(JSON.parse(await readFile(path.join(process.cwd(), "content/study", file), "utf8")))));
  const topicIds = new Set((await loadCurriculum()).flatMap((subject) => subject.modules.flatMap((item) => item.topics.map((topic) => `${subject.slug}.${topic.slug}`))));
  const sourceIds = new Set((await loadSources()).map((source) => source.id));
  return validateStudyLinks(seeds, topicIds, sourceIds);
}

export function validateStudyLinks(seeds: StudySeed[], topicIds: Set<string>, sourceIds: Set<string>) {
  const ids = new Set<string>();
  const versions = new Set<string>();
  const latest = new Map<string, number>();
  for (const seed of seeds) {
    const versionKey = `${seed.lesson.topicId}:${seed.lesson.version}`;
    if (versions.has(versionKey)) throw new Error("Versão de aula duplicada para o mesmo tópico.");
    versions.add(versionKey);
    latest.set(seed.lesson.topicId, Math.max(latest.get(seed.lesson.topicId) ?? 0, seed.lesson.version));
    if (!topicIds.has(seed.lesson.topicId) || ids.has(seed.lesson.id)) throw new Error("Aula com tópico inexistente ou ID duplicado.");
    ids.add(seed.lesson.id);
    for (const source of seed.lesson.teaching?.sources ?? []) {
      if (!sourceIds.has(source.sourceId)) throw new Error(`Fonte inexistente: ${source.sourceId}`);
    }
    for (const topic of [...(seed.lesson.teaching?.prerequisites.map((item) => item.topicId) ?? []), ...(seed.lesson.teaching?.advancedConnections.flatMap((item) => item.topicIds) ?? [])]) {
      if (!topicIds.has(topic)) throw new Error(`Conexão ou pré-requisito inexistente: ${topic}`);
    }
    for (const exercise of seed.exercises) {
      if (ids.has(exercise.id)) throw new Error("ID de exercício duplicado.");
      ids.add(exercise.id);
    }
  }
  for (const seed of seeds) {
    if (latest.get(seed.lesson.topicId) === seed.lesson.version && !seed.lesson.teaching) throw new Error(`A versão atual precisa de conteúdo aprofundado: ${seed.lesson.id}`);
  }
  return seeds;
}
