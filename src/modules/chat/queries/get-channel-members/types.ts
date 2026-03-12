import type { ChatMember } from "@prisma/client";

/**
 * Explicit DB row shape returned by fetchChannelMembers step.
 * Mirrors the `select` clause in steps/fetch-channel-members.ts.
 * Aligns 1:1 with the ChatMemberRecord SDL fields.
 */
export type ChannelMemberRow = Pick<
  ChatMember,
  | "id"
  | "conversationId"
  | "userId"
  | "lastReadMsgId"
  | "lastDeliveredMsgId"
  | "lastReadSeq"
  | "lastReadAt"
  | "role"
  | "isMuted"
  | "joinedAt"
>;

export type GetChannelMembersResult = ChannelMemberRow[];

