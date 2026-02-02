import { z } from "zod";
import { getUserConversationsSchema } from "./schema";
import { ConversationType } from "@/graphql/generated";

export type GetUserConversationsInput = z.infer<
  typeof getUserConversationsSchema
>;

export type ConversationEdge = {
  id: string;
  type: ConversationType;
  name: string | null;
  description: string | null;
  isPublic: boolean;
  workspaceId: string;
  projectId: string | null;
  memberCount: number;
  unreadCount: number;
  lastMessage: {
    id: string;
    content: any;
    authorUserId: string;
    createdAt: Date;
  } | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export type PageInfo = {
  hasNextPage: boolean;
  endCursor: string | null;
};

export type GetUserConversationsOutput = {
  edges: ConversationEdge[];
  pageInfo: PageInfo;
};
