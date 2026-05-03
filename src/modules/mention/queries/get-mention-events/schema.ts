import { z } from "zod";

export const GetMentionEventsSchema = z.object({
  mentionId: z.string().cuid(),
});

export type GetMentionEventsInput = z.infer<typeof GetMentionEventsSchema>;
