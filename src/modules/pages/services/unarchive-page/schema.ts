import { z } from "zod";
export const unarchivePageSchema = z.object({ pageId: z.string().cuid() });
export type UnarchivePageInput = z.infer<typeof unarchivePageSchema>;
