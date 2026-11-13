import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { StudySeedSchema } from "../study/schema";
import { loadCurriculum } from "./load-curriculum";

export async function loadStudy() {
  const filenames = (await readdir(path.join(process.cwd(), "content/study"))).filter((file) => file.endsWith(".json")).sort();
  const seeds = await Promise.all(filenames.map(async (file) => StudySeedSchema.parse(JSON.parse(await readFile(path.join(process.cwd(), "content/study", file), "utf8")))));
  const topicIds = new Set((await loadCurriculum()).flatMap((subject) => subject.modules.flatMap((item) => item.topics.map((topic) => `${subject.slug}.${topic.slug}`))));
  const ids = new Set<string>();
  for (const seed of seeds) {
    if (!topicIds.has(seed.lesson.topicId) || ids.has(seed.lesson.id)) throw new Error("Aula com tópico inexistente ou ID duplicado.");
    ids.add(seed.lesson.id);
    for (const exercise of seed.exercises) {
      if (ids.has(exercise.id)) throw new Error("ID de exercício duplicado.");
      ids.add(exercise.id);
    }
  }
  return seeds;
}
