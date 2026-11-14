import { probeSandboxAvailability } from "../src/lib/lab/sandbox";
import type { LabSandboxStatus } from "../src/lib/lab/schema";

export interface SandboxPolicyDeps {
  envValue?: string | undefined;
  probe?: () => Promise<LabSandboxStatus>;
  warn?: (message: string) => void;
}

const warnedSuites = new Set<string>();

/**
 * Lê a diretiva explícita SANDBOX_TESTS sem nunca silenciar ausências de bwrap/userns:
 * - Indefinido/vazio: não pula (exige sandbox funcional em tempo de execução).
 * - "skip": pula apenas os testes dependentes de bwrap e imprime aviso visível.
 * - Qualquer outro valor: falha imediatamente por configuração ambígua.
 */
export function readSandboxSkipDirective(
  suiteLabel: string,
  deps: Pick<SandboxPolicyDeps, "envValue" | "warn"> = {},
): { shouldSkip: boolean; warning?: string } {
  const rawMode = (deps.envValue ?? process.env.SANDBOX_TESTS ?? "").trim();

  if (rawMode === "skip") {
    const warning = `[SANDBOX_TESTS=skip] Pulando testes dependentes de bubblewrap (${suiteLabel}) por configuração explícita do ambiente.`;
    if (!deps.warn) {
      if (!warnedSuites.has(suiteLabel)) {
        warnedSuites.add(suiteLabel);
        console.warn(warning);
      }
    } else {
      deps.warn(warning);
    }
    return { shouldSkip: true, warning };
  }

  if (rawMode.length > 0) {
    throw new Error(
      `Valor inválido em SANDBOX_TESTS="${rawMode}" para ${suiteLabel}. Use SANDBOX_TESTS=skip para pular de forma explícita e visível ou deixe indefinido para exigir bubblewrap/user namespaces.`,
    );
  }

  return { shouldSkip: false };
}

/**
 * Garante antes de rodar testes reais de sandbox que bubblewrap e user namespaces funcionam.
 * Sem SANDBOX_TESTS=skip, falha de modo explícito e orientativo quando a sandbox não sobe.
 */
export async function assertSandboxAvailable(suiteLabel: string, deps: SandboxPolicyDeps = {}): Promise<void> {
  const directive = readSandboxSkipDirective(suiteLabel, deps);
  if (directive.shouldSkip) return;

  const probe = deps.probe ?? probeSandboxAvailability;
  const status = await probe();
  if (!status.available) {
    throw new Error(
      `Sandbox bubblewrap/user namespaces indisponível (${status.reason ?? "motivo desconhecido"}) em "${suiteLabel}". ` +
        `Estes testes exigem /usr/bin/bwrap, /usr/bin/python3 e unprivileged user namespaces habilitados por padrão (nunca pulam em silêncio). ` +
        `Se estiver em um ambiente sem user namespaces, execute explicitamente com SANDBOX_TESTS=skip.`,
    );
  }
}
