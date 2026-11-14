import { z } from "zod";
import { LAB_LIMITS, LabRunRequestSchema } from "../lab/schema";
import { SandboxAbortedError, SandboxBusyError, SandboxUnavailableError } from "../lab/sandbox";
import { LabError, type createLabService } from "../lab/service";
import { StudyError } from "../study/service";
import { LOOPBACK_HOSTS, readStudyJson } from "./study-handlers";

type LabService = ReturnType<typeof createLabService>;
const noCache = { "Cache-Control": "private, no-store" };

export function createLabHandlers(service: LabService) {
  return {
    async run(request: Request) {
      try {
        const raw = await readStudyJson(request, LAB_LIMITS.maxBodyBytes, {
          requireOrigin: true,
          allowedHosts: LOOPBACK_HOSTS,
        });
        const parsed = LabRunRequestSchema.parse(raw);
        const data = await service.run(parsed, { signal: request.signal });
        return Response.json({ data, meta: { version: 1 } }, { headers: noCache });
      } catch (error) {
        if (error instanceof SandboxAbortedError) {
          return Response.json(
            { error: { code: error.code, message: error.message } },
            { status: 499, headers: noCache },
          );
        }
        if (error instanceof z.ZodError) {
          return Response.json(
            { error: { code: "INVALID_REQUEST", message: error.issues[0]?.message ?? "Confira os campos enviados." } },
            { status: 400, headers: noCache },
          );
        }
        if (error instanceof StudyError) {
          return Response.json({ error: { code: `LAB_${error.status}`, message: error.message } }, { status: error.status, headers: noCache });
        }
        if (error instanceof LabError) {
          return Response.json({ error: { code: `LAB_${error.status}`, message: error.message } }, { status: error.status, headers: noCache });
        }
        if (error instanceof SandboxBusyError) {
          return Response.json({ error: { code: error.code, message: error.message } }, { status: 429, headers: noCache });
        }
        if (error instanceof SandboxUnavailableError) {
          return Response.json({ error: { code: error.code, message: error.message } }, { status: 503, headers: noCache });
        }
        console.error("Falha na execução do laboratório Python:", error);
        return Response.json(
          { error: { code: "LAB_UNAVAILABLE", message: "Não foi possível executar o código neste momento." } },
          { status: 503, headers: noCache },
        );
      }
    },
  };
}
