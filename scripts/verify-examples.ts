import { execFile } from "node:child_process";
import { loadLabs } from "../src/lib/content/load-labs";
import { loadStudy } from "../src/lib/content/load-study";
import { normalizeLabOutput } from "../src/lib/lab/public";
import { getDefaultSandboxRunner } from "../src/lib/lab/sandbox";
import {
  collectSeedExamples,
  getLessonExampleMode,
  verifyNonPythonSeed,
  type ExampleCheckItem,
} from "../src/lib/study/verification";

const runner = "import resource,sys,json,io\nresource.setrlimit(resource.RLIMIT_AS,(134217728,134217728))\nresource.setrlimit(resource.RLIMIT_CPU,(1,1))\nresource.setrlimit(resource.RLIMIT_FSIZE,(1048576,1048576))\nresource.setrlimit(resource.RLIMIT_NOFILE,(32,32))\npayload=json.loads(sys.stdin.read())\nsys.stdin=io.StringIO(payload.get('stdin',''))\nexec(compile(payload['code'],'<example>','exec'))";

async function execute(example: ExampleCheckItem): Promise<void> {
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

let count = 0, expectedErrors = 0, staticCount = 0;
for (const seed of await loadStudy()) {
  const mode = getLessonExampleMode(seed.lesson);
  if (mode === "PYTHON_SANDBOX") {
    for (const example of collectSeedExamples(seed)) {
      await execute(example);
      count++;
      if (example.expectedError) expectedErrors++;
    }
  } else {
    const result = verifyNonPythonSeed(seed);
    staticCount += result.checkedCount;
  }
}
if (!count) throw new Error("Nenhum exemplo Python foi executado.");
const labRunner = getDefaultSandboxRunner();
let labCases = 0;
for (const lab of await loadLabs()) {
  const starterFree = await labRunner.execute({ code: lab.starterFreeCode });
  if (starterFree.exitCode !== 0 || starterFree.timedOut) {
    throw new Error(`Código inicial livre do laboratório ${lab.id} falhou: ${starterFree.stderr}`);
  }
  labCases++;
  for (const challenge of lab.challenges) {
    for (const testCase of challenge.tests) {
      const result = await labRunner.execute({ code: challenge.referenceSolution, stdin: testCase.stdin });
      const actual = normalizeLabOutput(result.stdout);
      const expected = normalizeLabOutput(testCase.expectedOutput);
      if (result.exitCode !== 0 || result.timedOut || actual !== expected) {
        throw new Error(`Solução do desafio ${challenge.id}/${testCase.id} falhou: esperado ${JSON.stringify(expected)}, obtido ${JSON.stringify(actual)} (stderr: ${result.stderr})`);
      }
      labCases++;
    }
  }
}
console.log(`${count} exemplos/soluções Python e ${labCases} verificações de laboratório confirmados em sandbox (${expectedErrors} erro(s) intencional(is) confirmado(s)); ${staticCount} artefatos estáticos/conceituais verificados estruturalmente.`);
