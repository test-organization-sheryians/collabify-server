import { z } from "zod";

export const getChannelMessagesSchema = z.object({
  channelId: z.string().cuid(),
  limit: z.number().min(1).max(100).default(50),
  beforeCursor: z.string().optional(), // Message ID (ULID)
});
