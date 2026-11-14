import { getStudyService } from "@/lib/study";
import { createStudyHandlers } from "@/lib/http/study-handlers";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return createStudyHandlers(getStudyService()).revealHint(request, (await context.params).id);
}
