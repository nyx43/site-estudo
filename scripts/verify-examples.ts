import { execFile } from "node:child_process";
import { loadStudy } from "../src/lib/content/load-study";

const runner = "import resource,sys\nresource.setrlimit(resource.RLIMIT_AS,(134217728,134217728))\nresource.setrlimit(resource.RLIMIT_CPU,(1,1))\nresource.setrlimit(resource.RLIMIT_FSIZE,(1048576,1048576))\nresource.setrlimit(resource.RLIMIT_NOFILE,(32,32))\nexec(compile(sys.stdin.read(),'<example>','exec'))";

async function execute(code: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const process = execFile("bwrap", ["--unshare-all", "--die-with-parent", "--new-session", "--cap-drop", "ALL", "--ro-bind", "/usr", "/usr", "--ro-bind", "/lib", "/lib", "--symlink", "usr/lib64", "/lib64", "--proc", "/proc", "--dev", "/dev", "--tmpfs", "/tmp", "--clearenv", "--setenv", "PATH", "/usr/bin", "/usr/bin/python3", "-I", "-c", runner], { timeout: 3000, maxBuffer: 16384 }, (error, stdout, stderr) => {
      if (error) reject(new Error(`Exemplo não verificado em isolamento: ${stderr}`, { cause: error }));
      else resolve(stdout.replace(/\n$/, ""));
    });
    process.stdin?.end(code);
  });
}

let count = 0;
for (const seed of await loadStudy()) {
  const { lesson } = seed;
  const examples = [
    { code: lesson.concept.code, output: lesson.concept.expectedOutput },
    ...lesson.workedExamples.map((example) => ({ code: example.subgoals.map((subgoal) => subgoal.code).join("\n"), output: example.expectedOutput })),
    { code: lesson.efficiency.naive, output: lesson.efficiency.expectedOutput },
    { code: lesson.efficiency.better, output: lesson.efficiency.expectedOutput },
    ...seed.exercises.flatMap((exercise) => exercise.type === "PRIMM_PREDICT" ? [{ code: exercise.code, output: exercise.solution.output }] : exercise.type === "PARSONS" ? exercise.solution.orders.map((order) => ({ code: order.map((block) => `${"    ".repeat(block.indent)}${exercise.blocks.find((item) => item.id === block.id)!.code}`).join("\n"), output: exercise.solution.output })) : []),
  ];
  for (const example of examples) {
    const result = await execute(example.code);
    if (result !== example.output) throw new Error(`Saída divergente em ${lesson.id}: esperado ${JSON.stringify(example.output)}, recebido ${JSON.stringify(result)}`);
    count++;
  }
}
if (!count) throw new Error("Nenhum exemplo foi executado.");
console.log(`${count} exemplos/soluções executados em sandbox sem rede ou acesso ao projeto, com limites de tempo, memória e saída.`);
