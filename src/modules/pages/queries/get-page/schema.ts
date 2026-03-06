import { z } from "zod";

export const getPageSchema = z.object({
  pageId: z.string().cuid(),
});

export type GetPageInput = z.infer<typeof getPageSchema>;
