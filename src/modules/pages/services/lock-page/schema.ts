import { z } from "zod";
export const lockPageSchema = z.object({ pageId: z.string().cuid() });
export type LockPageInput = z.infer<typeof lockPageSchema>;
