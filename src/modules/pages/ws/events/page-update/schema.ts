import { z } from "zod";

export const pageUpdateSchema = z.object({
  pageId: z.string().cuid(),
  /** base64-encoded Yjs XmlFragment binary delta */
  update: z.string(),
  /** UUIDv4 client-side deduplication ID */
  dedupeId: z.string().uuid(),
});

export type PageUpdateInput = z.infer<typeof pageUpdateSchema>;
