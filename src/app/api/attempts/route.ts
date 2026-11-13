import { getStudyService } from "@/lib/study";
import { createStudyHandlers } from "@/lib/http/study-handlers";

export async function POST(request: Request) { return createStudyHandlers(getStudyService()).start(request); }
