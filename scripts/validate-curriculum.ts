import { loadCurriculum } from "../src/lib/content/load-curriculum";
import { loadStudy } from "../src/lib/content/load-study";

async function main() {
  const subjects = await loadCurriculum();
  const modules = subjects.flatMap((subject) => subject.modules);
  console.log(`Currículo válido: ${subjects.length} disciplinas, ${modules.length} módulos, ${modules.flatMap((module) => module.topics).length} tópicos planejados.`);
  const seeds = await loadStudy();
  const latest = new Map<string, typeof seeds[number]>();
  for (const seed of seeds) if (!latest.has(seed.lesson.topicId) || latest.get(seed.lesson.topicId)!.lesson.version < seed.lesson.version) latest.set(seed.lesson.topicId, seed);
  console.log(`Conteúdo válido: ${latest.size} aulas atuais, ${[...latest.values()].flatMap((seed) => seed.exercises).length} exercícios atuais; ${seeds.length} versões preservadas.`);
}

main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
