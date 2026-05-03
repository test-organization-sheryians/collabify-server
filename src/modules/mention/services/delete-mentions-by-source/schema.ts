import { z } from "zod";

export const DeleteMentionsBySourceSchema = z.object({
  sourceEntityId: z.string().cuid(),
});

export type DeleteMentionsBySourceInput = z.infer<typeof DeleteMentionsBySourceSchema>;
