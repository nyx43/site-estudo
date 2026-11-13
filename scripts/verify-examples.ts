import { execFile } from "node:child_process";
import { loadStudy } from "../src/lib/content/load-study";
import type { ExplainedExample } from "../src/lib/study/teaching-schema";

type Check = { code: string; expectedOutput?: string; expectedError?: string; stdin?: string; title?: string };
const runner = "import resource,sys,json,io\nresource.setrlimit(resource.RLIMIT_AS,(134217728,134217728))\nresource.setrlimit(resource.RLIMIT_CPU,(1,1))\nresource.setrlimit(resource.RLIMIT_FSIZE,(1048576,1048576))\nresource.setrlimit(resource.RLIMIT_NOFILE,(32,32))\npayload=json.loads(sys.stdin.read())\nsys.stdin=io.StringIO(payload.get('stdin',''))\nexec(compile(payload['code'],'<example>','exec'))";

async function execute(example: Check): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = execFile("bwrap", ["--unshare-all", "--die-with-parent", "--new-session", "--cap-drop", "ALL", "--ro-bind", "/usr", "/usr", "--ro-bind", "/lib", "/lib", "--symlink", "usr/lib64", "/lib64", "--proc", "/proc", "--dev", "/dev", "--tmpfs", "/tmp", "--clearenv", "--setenv", "PATH", "/usr/bin", "/usr/bin/python3", "-I", "-c", runner], { timeout: 3000, maxBuffer: 16384 }, (error, stdout, stderr) => {
      if (example.expectedError) {
        const lastLine = stderr.trim().split("\n").at(-1) ?? "";
        if (error?.code === 1 && !error.killed && lastLine.startsWith(`${example.expectedError}:`)) resolve();
        else reject(new Error(`Erro esperado não confirmado em ${example.title ?? "exemplo"}: ${example.expectedError}. ${stderr}`, { cause: error }));
      } else if (error) reject(new Error(`Exemplo não verificado em isolamento: ${stderr}`, { cause: error }));
      else if (stdout.replace(/\n$/, "") !== example.expectedOutput) reject(new Error(`Saída divergente em ${example.title ?? "exemplo"}: esperado ${JSON.stringify(example.expectedOutput)}, recebido ${JSON.stringify(stdout)}`));
      else resolve();
    });
    child.stdin?.end(JSON.stringify({ code: example.code, stdin: example.stdin ?? "" }));
  });
}

let count = 0, expectedErrors = 0;
for (const seed of await loadStudy()) {
  const { lesson } = seed;
  const teaching = lesson.teaching;
  const explained: ExplainedExample[] = teaching ? [
    ...teaching.commands.flatMap((command) => command.examples), ...teaching.walkthroughs,
    ...teaching.edgeCases.map((item) => item.example),
    ...teaching.aiReview.flatMap((item) => [item.generated, item.correction]),
  ] : [];
  const examples: Check[] = [
    { code: lesson.concept.code, expectedOutput: lesson.concept.expectedOutput },
    ...lesson.workedExamples.map((example) => ({ code: example.subgoals.map((subgoal) => subgoal.code).join("\n"), expectedOutput: example.expectedOutput })),
    { code: lesson.efficiency.naive, expectedOutput: lesson.efficiency.expectedOutput },
    { code: lesson.efficiency.better, expectedOutput: lesson.efficiency.expectedOutput },
    ...seed.exercises.flatMap((exercise) => exercise.type === "PRIMM_PREDICT" ? [{ code: exercise.code, expectedOutput: exercise.solution.output }] : exercise.type === "PARSONS" ? exercise.solution.orders.map((order) => ({ code: order.map((block) => `${"    ".repeat(block.indent)}${exercise.blocks.find((item) => item.id === block.id)!.code}`).join("\n"), expectedOutput: exercise.solution.output })) : []),
    ...explained,
  ];
  for (const example of examples) { await execute(example); count++; if (example.expectedError) expectedErrors++; }
}
if (!count) throw new Error("Nenhum exemplo foi executado.");
console.log(`${count} exemplos/soluções verificados em sandbox sem rede ou acesso ao projeto (${expectedErrors} erro(s) intencional(is) confirmado(s)).`);
