import { z } from "zod";

export const unsubscribeChannelSchema = z.object({
  conversationId: z.string().uuid(),
});

export type UnsubscribeChannelInput = z.infer<typeof unsubscribeChannelSchema>;
