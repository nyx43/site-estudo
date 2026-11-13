import { z } from "zod";

export const SourceSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/),
  title: z.string().trim().min(1),
  kind: z.enum(["OFFICIAL_DOCUMENTATION", "LECTURE_SLIDES", "TEXTBOOK", "COURSE_NOTES"]),
  author: z.string().trim().min(1), edition: z.string().trim().min(1).optional(),
  url: z.url().refine((url) => new URL(url).protocol === "https:").optional(),
  checkedAt: z.iso.date().optional(),
  note: z.string().trim().min(1),
}).strict();
export type ContentSource = z.infer<typeof SourceSchema>;
