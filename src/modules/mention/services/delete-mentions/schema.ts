import { z } from "zod";

export const DeleteMentionsSchema = z.object({
  mentionIds: z.array(z.string().cuid()).min(1).max(100),
});

export type DeleteMentionsInput = z.infer<typeof DeleteMentionsSchema>;
