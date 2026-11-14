import { createLabHandlers } from "@/lib/http/lab-handlers";
import { getLabService } from "@/lib/lab";

export const dynamic = "force-dynamic";

export async function GET() {
  return createLabHandlers(getLabService()).status();
}
