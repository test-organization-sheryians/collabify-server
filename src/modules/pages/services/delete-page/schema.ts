import { z } from "zod";

export const deletePageSchema = z.object({
  pageId: z.string().cuid(),
  workspaceId: z.string().cuid(),
});

export type DeletePageInput = z.infer<typeof deletePageSchema>;
