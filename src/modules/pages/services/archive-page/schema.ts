import { z } from "zod";
export const archivePageSchema = z.object({ pageId: z.string().cuid() });
export type ArchivePageInput = z.infer<typeof archivePageSchema>;
