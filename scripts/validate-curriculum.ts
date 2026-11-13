import { loadCurriculum } from "../src/lib/content/load-curriculum";
import { loadStudy } from "../src/lib/content/load-study";

async function main() {
  const subjects = await loadCurriculum();
  const modules = subjects.flatMap((subject) => subject.modules);
  console.log(`Currículo válido: ${subjects.length} disciplinas, ${modules.length} módulos, ${modules.flatMap((module) => module.topics).length} tópicos planejados.`);
  const seeds = await loadStudy();
  console.log(`Conteúdo de estudo válido: ${seeds.length} aula(s), ${seeds.flatMap((seed) => seed.exercises).length} exercícios.`);
}

main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
