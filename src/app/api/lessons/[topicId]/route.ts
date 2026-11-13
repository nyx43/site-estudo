import { getStudyService } from "@/lib/study";
import { createStudyHandlers } from "@/lib/http/study-handlers";

export const dynamic = "force-dynamic";
export async function GET(_request: Request, context: { params: Promise<{ topicId: string }> }) {
  return createStudyHandlers(getStudyService()).lesson((await context.params).topicId);
}
