import { z } from "zod";

export const getMissingMessagesSchema = z.object({
  channelId: z.string().cuid(),
  rangeStart: z.string().ulid(),
  rangeEnd: z.string().ulid(),
});

export type GetMissingMessagesInput = z.infer<typeof getMissingMessagesSchema>;
