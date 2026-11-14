import { LAB_LIMITS } from "./schema";

export const LAB_DRAFTS_STORAGE_KEY = "estudo-lab-drafts-v1";

export interface LabDraftEntry {
  code: string;
  stdin: string;
  passed?: boolean;
  updatedAt: string;
}

export type LabDraftMap = Record<string, LabDraftEntry>;

export function buildLabDraftKey(labId: string, scopeId: string): string {
  return `${labId}::${scopeId}`;
}

export function parseLabDraftStore(raw: string | null | undefined): LabDraftMap {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const result: LabDraftMap = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (!value || typeof value !== "object" || Array.isArray(value)) continue;
      const entry = value as Record<string, unknown>;
      if (typeof entry.code !== "string") continue;
      result[key] = {
        code: entry.code.slice(0, LAB_LIMITS.maxCodeChars),
        stdin: typeof entry.stdin === "string" ? entry.stdin.slice(0, LAB_LIMITS.maxStdinChars) : "",
        ...(typeof entry.passed === "boolean" ? { passed: entry.passed } : {}),
        updatedAt: typeof entry.updatedAt === "string" ? entry.updatedAt : "",
      };
    }
    return result;
  } catch {
    return {};
  }
}

export function serializeLabDraftStore(store: LabDraftMap): string {
  const entries = Object.entries(store).slice(0, 64);
  const compact: LabDraftMap = {};
  for (const [key, value] of entries) {
    compact[key] = {
      code: value.code.slice(0, LAB_LIMITS.maxCodeChars),
      stdin: value.stdin.slice(0, LAB_LIMITS.maxStdinChars),
      ...(value.passed ? { passed: true } : {}),
      updatedAt: value.updatedAt,
    };
  }
  return JSON.stringify(compact);
}
