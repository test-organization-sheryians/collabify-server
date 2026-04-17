import { z } from "zod";

export const OrphanMentionsSchema = z.object({
  targetEntityId: z.string().cuid(),
});

export type OrphanMentionsInput = z.infer<typeof OrphanMentionsSchema>;
