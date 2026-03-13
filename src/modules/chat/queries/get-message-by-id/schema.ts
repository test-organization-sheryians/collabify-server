import { z } from "zod";

export const getMessageByIdSchema = z.object({
  messageId: z.string().ulid(),
});

export type GetMessageByIdInput = z.infer<typeof getMessageByIdSchema>;
