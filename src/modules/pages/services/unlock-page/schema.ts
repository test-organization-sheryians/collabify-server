import { z } from "zod";
export const unlockPageSchema = z.object({ pageId: z.string().cuid() });
export type UnlockPageInput = z.infer<typeof unlockPageSchema>;
