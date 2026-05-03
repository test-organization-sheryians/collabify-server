import { z } from "zod";

export const renamePageSchema = z.object({
  pageId: z.string().cuid(),
  title: z.string().min(1).max(500),
});

export type RenamePageInput = z.infer<typeof renamePageSchema>;
