import { z } from "zod";

export const subscribeChannelSchema = z.object({
  conversationId: z.string().uuid(),
});

export type SubscribeChannelInput = z.infer<typeof subscribeChannelSchema>;
