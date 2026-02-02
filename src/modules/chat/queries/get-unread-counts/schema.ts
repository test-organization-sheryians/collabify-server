import { z } from "zod";

export const getUnreadCountsSchema = z.object({
  workspaceId: z.string(),
  projectId: z.string(),
});

export type GetUnreadCountsInput = z.infer<typeof getUnreadCountsSchema>;

export interface UnreadCount {
  conversationId: string;
  unreadCount: number;
  lastUnreadMessageId: string | null;
}

export interface GetUnreadCountsOutput {
  conversations: UnreadCount[];
}
