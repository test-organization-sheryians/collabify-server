import { z } from "zod";
import type { Conversation } from "@/graphql/generated";

export const getUserConversationsSchema = z.object({
  workspaceId: z.string().cuid(),
  projectId: z.string().cuid(),
  type: z.enum(["CHANNEL", "DM", "GROUP_DM"]).optional(),
  includeArchived: z.boolean().optional(),
  limit: z.number().min(1).max(100).optional(),
  cursor: z.string().optional(),
});

export type GetUserConversationsInput = z.infer<typeof getUserConversationsSchema>;

export type PageInfo = {
  hasNextPage: boolean;
  endCursor: string | null;
};

export type GetUserConversationsOutput = {
  edges: Conversation[];
  pageInfo: PageInfo;
};
