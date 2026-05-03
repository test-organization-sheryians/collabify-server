import { z } from "zod";

export const UpdateMentionInputSchema = z.object({
  mentionId: z.string().cuid(),
  displayText: z.string().min(1).max(500).trim().optional(),
  sourceLocation: z.record(z.string(), z.unknown()).optional(),
});

export const UpdateMentionSchema = z.object({
  input: UpdateMentionInputSchema,
});

export type UpdateMentionInput = z.infer<typeof UpdateMentionSchema>;
