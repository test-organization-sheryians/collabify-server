import { z } from "zod";

export const unsubscribeChannelSchema = z.object({
  conversationId: z.string().min(1),
});

export type UnsubscribeChannelInput = z.infer<typeof unsubscribeChannelSchema>;
