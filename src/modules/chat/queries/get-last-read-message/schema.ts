import { z } from "zod";

export const getLastReadMessageSchema = z.object({
  channelId: z.string().cuid(),
});
