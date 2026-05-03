import { z } from "zod";

export const sendMessageSchema = z.object({
  conversationId: z.string().min(1),
  conversationType: z.enum(["CHANNEL", "DM", "GROUP_DM", "THREAD"]).optional(),
  content: z.string().max(4000).default(""),
  dedupeId: z.string().uuid(),
  parentMessageId: z.string().uuid().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
}).refine(
  (data) => {
    const hasContent = data.content.trim().length > 0;
    const hasAttachments =
      Array.isArray((data.metadata as any)?.attachments) &&
      (data.metadata as any).attachments.length > 0;
    return hasContent || hasAttachments;
  },
  { message: "Message must have content or at least one attachment" }
);

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
