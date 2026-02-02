import { z } from "zod";

export const createThreadInputSchema = z.object({
  workspaceId: z.string().min(1, "Workspace ID is required"),
  projectId: z.string().min(1, "Project ID is required"),
  conversationId: z.string().min(1, "Conversation ID is required"),
  messageId: z.string().min(1, "Message ID is required"),
});

export type CreateThreadInput = z.infer<typeof createThreadInputSchema>;
