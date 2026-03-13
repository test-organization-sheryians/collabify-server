import { z } from "zod";

export const getMessagesAfterCursorSchema = z.object({
  channelId: z.string().cuid(),
  afterCursor: z.string().ulid(),
  limit: z.number().min(1).max(100).default(50),
});

export type GetMessagesAfterCursorInput = z.infer<typeof getMessagesAfterCursorSchema>;
