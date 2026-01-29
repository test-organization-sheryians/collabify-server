import { z } from "zod";

export const subscribeChannelSchema = z.object({
  conversationId: z.string().min(1),
  lastSequence: z.number().optional(),
  epoch: z.string().optional(),
});

export type SubscribeChannelInput = z.infer<typeof subscribeChannelSchema>;
