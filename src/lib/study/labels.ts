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

export const layerLabels = {
  C1: "C1 · Base",
  C2: "C2 · Mecanismo e aplicação",
  C3: "C3 · Domínio e integração",
} as const;

export const scopeLabels = {
  JUNIOR: "Júnior (escopo simulado)",
  PLENO: "Pleno (escopo simulado)",
  SENIOR: "Sênior (escopo simulado)",
} as const;

export const attemptStatusLabels = {
  PENDING: "Não iniciado",
  IN_PROGRESS: "Em andamento",
  SOLVED: "Resolvido",
  SUBMITTED_FOR_REVIEW: "Enviado para autoavaliação",
  SELF_ASSESSED: "Autoavaliação registrada",
  GAVE_UP: "Solução consultada",
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
