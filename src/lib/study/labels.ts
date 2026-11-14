import type { LessonStep } from "./schema";

export const kindLabels = {
  FUNCTION: "Função",
  TYPE: "Tipo / construtor",
  KEYWORD: "Palavra-chave",
  OPERATOR: "Operador",
  SYNTAX: "Sintaxe",
  CONCEPT: "Conceito",
  TOOL: "Ferramenta",
} as const;

export const levelLabels = {
  FOUNDATION: "Fundamentos",
  INTERMEDIATE: "Intermediário",
  ADVANCED: "Avançado",
  SPECIALIZED: "Casos específicos",
} as const;

export const articleSections: readonly { id: LessonStep; label: string }[] = [
  { id: "why", label: "Por que aprender" },
  { id: "mental-model", label: "Modelo mental" },
  { id: "concept", label: "Comandos e sintaxe" },
  { id: "worked-example", label: "Exemplos por linha" },
  { id: "misconceptions", label: "Erros e casos específicos" },
  { id: "uses", label: "Onde aplicar" },
  { id: "efficiency", label: "Revisar código de IA" },
];
