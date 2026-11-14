import { getStudyService } from "@/lib/study";
import { createStudyHandlers } from "@/lib/http/study-handlers";

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  return createStudyHandlers(getStudyService()).saveSelfAssessment(request, (await context.params).id);
}
