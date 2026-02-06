import { z } from "zod";

export const getThreadMessagesSchema = z.object({
  parentMessageId: z.string().ulid(),
  limit: z.number().min(1).max(100).default(50),
  beforeCursor: z.string().optional(),
});
