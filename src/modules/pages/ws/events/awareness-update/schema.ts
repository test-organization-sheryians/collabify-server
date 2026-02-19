import { z } from "zod";

export const awarenessUpdateSchema = z.object({
  pageId: z.string().cuid(),
  /** base64-encoded y-protocols/awareness binary */
  update: z.string(),
});

export type AwarenessUpdateInput = z.infer<typeof awarenessUpdateSchema>;
