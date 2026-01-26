import { z } from "zod";

export const subscribeChannelSchema = z.object({
  conversationId: z.string().min(1),
});

export type SubscribeChannelInput = z.infer<typeof subscribeChannelSchema>;
