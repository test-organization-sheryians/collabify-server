import { z } from "zod";

export const GetMentionsSchema = z.object({
  sourceEntityId: z.string().cuid(),
});

export type GetMentionsInput = z.infer<typeof GetMentionsSchema>;
