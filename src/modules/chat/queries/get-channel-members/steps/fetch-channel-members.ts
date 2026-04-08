import { Prisma } from "@prisma/client";
import type { ServiceContext } from "@/graphql/types";
import type { GetChannelMembersInput } from "../schema";

// Select const lives here — next to the query that uses it.
// ChannelMemberRow derives from it via GetPayload so they can never drift.
const channelMemberSelect = {
  id: true,
  conversationId: true,
  userId: true,
  lastReadMsgId: true,
  lastDeliveredMsgId: true,
  lastReadSeq: true,
  lastReadAt: true,
  isMuted: true,
  joinedAt: true,
} satisfies Prisma.ChatMemberSelect;

export type ChannelMemberRow = Prisma.ChatMemberGetPayload<{
  select: typeof channelMemberSelect;
}>;

export type GetChannelMembersResult = ChannelMemberRow[];

/**
 * fetchChannelMembers — paginates chatMember rows for the given channel.
 *
 * Role sort removed: channel-level role was dropped from the schema.
 * Members are returned ordered by joinedAt ascending.
 */
export async function fetchChannelMembers(
  input: GetChannelMembersInput,
  ctx: ServiceContext
): Promise<ChannelMemberRow[]> {
  return ctx.db.chatMember.findMany({
    where: { conversationId: input.channelId },
    take: input.limit,
    skip: input.offset,
    select: channelMemberSelect,
    orderBy: { joinedAt: "asc" },
  });
}
