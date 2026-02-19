import { z } from "zod";

export const unsubscribePageSchema = z.object({
  pageId: z.string().cuid(),
});

export type UnsubscribePageInput = z.infer<typeof unsubscribePageSchema>;
