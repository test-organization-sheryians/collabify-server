import { z } from "zod";

export const DeleteAccountSchema = z.object({
  userId: z.string(),
});

export type DeleteAccountInput = z.infer<typeof DeleteAccountSchema>;
