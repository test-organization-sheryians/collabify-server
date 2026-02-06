import { z } from "zod";

export const getChannelMembersSchema = z.object({
  channelId: z.string().cuid(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

export type GetChannelMembersInput = z.infer<typeof getChannelMembersSchema>;
