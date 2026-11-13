import { z } from "zod";
import { AnswerSchema, lessonSteps } from "../study/schema";
import { StudyError, type createStudyService } from "../study/service";

type Service = ReturnType<typeof createStudyService>;
const progressChange = z.discriminatedUnion("action", [
  z.object({ action: z.literal("ANSWER"), questionId: z.string().min(1).max(100), answer: z.string().trim().min(1).max(2000) }).strict(),
  z.object({ action: z.literal("COMPLETE_STEP"), step: z.enum(lessonSteps) }).strict(),
]);
const noCache = { "Cache-Control": "private, no-store" };

export async function studyResponse(operation: () => Promise<unknown>) {
  try {
    const data = await operation();
    if (data === null) throw new StudyError(404, "Conteúdo de estudo não encontrado.");
    return Response.json({ data, meta: { version: 1 } }, { headers: noCache });
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ error: { code: "INVALID_REQUEST", message: "Confira os campos enviados." } }, { status: 400, headers: noCache });
    if (error instanceof StudyError) return Response.json({ error: { code: `STUDY_${error.status}`, message: error.message } }, { status: error.status, headers: noCache });
    console.error("Falha no serviço de estudo:", error);
    return Response.json({ error: { code: "STUDY_UNAVAILABLE", message: "Não foi possível salvar ou carregar o estudo. Tente novamente." } }, { status: 503, headers: noCache });
  }
}

export function checkOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return;
  const url = new URL(request.url);
  let browserOrigin: URL;
  try { browserOrigin = new URL(origin); } catch { throw new StudyError(403, "Origem da requisição não permitida."); }
  // Next may construct request.url with its bind hostname. Host retains the requested authority.
  if (browserOrigin.host !== (request.headers.get("host") ?? url.host) || browserOrigin.protocol !== url.protocol) throw new StudyError(403, "Origem da requisição não permitida.");
}

export async function readStudyJson(request: Request): Promise<unknown> {
  checkOrigin(request);
  if (!request.headers.get("content-type")?.startsWith("application/json")) throw new StudyError(415, "Envie dados em JSON.");
  const reader = request.body?.getReader();
  if (!reader) throw new StudyError(400, "Corpo da requisição ausente.");
  const decoder = new TextDecoder();
  let body = "", size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 16384) { await reader.cancel(); throw new StudyError(413, "Resposta muito longa."); }
      body += decoder.decode(value, { stream: true });
    }
    body += decoder.decode();
  } finally { reader.releaseLock(); }
  try { return JSON.parse(body) as unknown; } catch { throw new StudyError(400, "JSON inválido."); }
}

export function createStudyHandlers(service: Service) {
  return {
    lesson: (topicId: string, version?: string) => studyResponse(() => service.lesson(topicId, version === undefined ? undefined : z.coerce.number().int().positive().max(1000000).parse(version))),
    progress: (request: Request, lessonId: string) => studyResponse(async () => service.progress(lessonId, progressChange.parse(await readStudyJson(request)))),
    exercise: (id: string) => studyResponse(() => service.exercise(id)),
    start: (request: Request) => studyResponse(async () => service.start(z.object({ exerciseId: z.string().min(1).max(200) }).strict().parse(await readStudyJson(request)).exerciseId)),
    submit: (request: Request, attemptId: string) => studyResponse(async () => {
      const input = z.object({ requestId: z.uuid(), answer: AnswerSchema }).strict().parse(await readStudyJson(request));
      return service.submit(attemptId, input.requestId, input.answer);
    }),
    giveUp: (request: Request, attemptId: string) => studyResponse(async () => { checkOrigin(request); return service.giveUp(attemptId); }),
  };
}
