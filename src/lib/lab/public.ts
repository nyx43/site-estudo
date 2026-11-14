import type { LabDefinition } from "./schema";

export type PublicLabChallenge = Omit<LabDefinition["challenges"][number], "referenceSolution">;

export type PublicLab = Omit<LabDefinition, "challenges"> & {
  challenges: PublicLabChallenge[];
};

/** Remove soluções de referência privadas antes de enviar o laboratório para componentes/API públicos. */
export function toPublicLab(lab: LabDefinition): PublicLab {
  return {
    schemaVersion: lab.schemaVersion,
    id: lab.id,
    topicId: lab.topicId,
    title: lab.title,
    intro: lab.intro,
    language: lab.language,
    starterFreeCode: lab.starterFreeCode,
    challenges: lab.challenges.map((challenge) => ({
      id: challenge.id,
      title: challenge.title,
      prompt: challenge.prompt,
      starterCode: challenge.starterCode,
      ...(challenge.hint ? { hint: challenge.hint } : {}),
      defaultStdin: challenge.defaultStdin,
      tests: challenge.tests,
    })),
  };
}

/** Normaliza quebras de linha Windows/Unix e remove quebra final única na comparação de saídas. */
export function normalizeLabOutput(value: string): string {
  return value.replace(/\r\n/g, "\n").replace(/\n$/, "");
}
