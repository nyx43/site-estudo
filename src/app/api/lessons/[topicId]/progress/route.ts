import { getStudyService } from "@/lib/study";
import { createStudyHandlers } from "@/lib/http/study-handlers";

export async function POST(request: Request, context: { params: Promise<{ topicId: string }> }) {
  // The progress endpoint receives the versioned lesson ID; GET receives a topic ID.
  return createStudyHandlers(getStudyService()).progress(request, (await context.params).topicId);
}
