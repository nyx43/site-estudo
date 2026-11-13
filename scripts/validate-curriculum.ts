import { loadCurriculum } from "../src/lib/content/load-curriculum";

async function main() {
  const subjects = await loadCurriculum();
  const modules = subjects.flatMap((subject) => subject.modules);
  console.log(`Currículo válido: ${subjects.length} disciplinas, ${modules.length} módulos, ${modules.flatMap((module) => module.topics).length} tópicos planejados.`);
}

main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
