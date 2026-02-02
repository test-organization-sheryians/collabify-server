import { z } from "zod";
import { getConversationSchema } from "./schema";
import { ConversationType } from "@/graphql/generated";

export type GetConversationInput = z.infer<typeof getConversationSchema>;

export type ConversationMemberDetails = {
  userId: string;
  role: string;
  isMuted: boolean;
  joinedAt: Date;
  user: {
    id: string;
    fullName: string;
    email: string;
    avatarUrl: string | null;
  };
};

export type GetConversationOutput = {
  id: string;
  type: ConversationType;
  name: string | null;
  description: string | null;
  isPublic: boolean;
  workspaceId: string;
  projectId: string | null;
  parentMessageId: string | null;
  createdBy: string | null;
  memberCount: number;
  unreadCount: number;
  members: ConversationMemberDetails[];
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
