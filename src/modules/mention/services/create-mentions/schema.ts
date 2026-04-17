import { z } from "zod";

export const CreateMentionInputSchema = z.object({
  sourceEntityId: z.string().cuid(),
  sourceEntityType: z.enum(["PAGE", "ISSUE", "CHAT_MESSAGE"]),
  targetEntityId: z.string().cuid(),
  targetEntityType: z.enum(["PAGE", "ISSUE", "VAULT_FILE", "VAULT_FOLDER", "WHITEBOARD", "USER"]),
  displayText: z.string().min(1).max(500).trim(),
  sourceLocation: z.record(z.string(), z.unknown()).optional(),
});

export const CreateMentionsSchema = z.object({
  mentions: z.array(CreateMentionInputSchema).min(1).max(50),
});

export type CreateMentionsInput = z.infer<typeof CreateMentionsSchema>;
export type CreateMentionInput = z.infer<typeof CreateMentionInputSchema>;
