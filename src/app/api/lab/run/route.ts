import { createLabHandlers } from "@/lib/http/lab-handlers";
import { getLabService } from "@/lib/lab";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return createLabHandlers(getLabService()).run(request);
}
