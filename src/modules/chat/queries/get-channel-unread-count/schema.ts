import { z } from "zod";

export const getChannelUnreadCountSchema = z.object({
  channelId: z.string().cuid(),
});
