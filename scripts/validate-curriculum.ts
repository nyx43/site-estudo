import { loadCurriculum } from "../src/lib/content/load-curriculum";
import { loadLabs, validateLabLinks } from "../src/lib/content/load-labs";
import { loadStudy } from "../src/lib/content/load-study";

async function main() {
  const subjects = await loadCurriculum();
  const modules = subjects.flatMap((subject) => subject.modules);
  const topics = modules.flatMap((module) => module.topics);
  const topicIds = new Set(subjects.flatMap((subject) => subject.modules.flatMap((module) => module.topics.map((topic) => `${subject.slug}.${topic.slug}`))));
  console.log(`Currículo válido: ${subjects.length} disciplinas, ${modules.length} módulos, ${topics.length} tópicos planejados.`);
  const seeds = await loadStudy();
  const latest = new Map<string, typeof seeds[number]>();
  for (const seed of seeds) if (!latest.has(seed.lesson.topicId) || latest.get(seed.lesson.topicId)!.lesson.version < seed.lesson.version) latest.set(seed.lesson.topicId, seed);
  console.log(`Conteúdo válido: ${latest.size} aulas atuais, ${[...latest.values()].flatMap((seed) => seed.exercises).length} exercícios atuais; ${seeds.length} versões preservadas.`);
  const labs = await loadLabs();
  validateLabLinks(labs, topicIds);
  console.log(`Laboratórios válidos: ${labs.length} laboratório(s), ${labs.reduce((sum, lab) => sum + lab.challenges.length, 0)} desafio(s).`);
}

main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
