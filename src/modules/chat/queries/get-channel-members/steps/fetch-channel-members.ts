import type { ServiceContext } from "@/graphql/types";
import type { GetChannelMembersInput } from "../schema";
import type { ChannelMemberRow } from "../types";

/**
 * Role priority map — lower number = higher rank in the list.
 * Alphabetical sort (the previous approach) produces ADMIN→GUEST→MEMBER→OWNER
 * which is the wrong order. This explicit map fixes that.
 */
const ROLE_ORDER: Record<string, number> = {
  OWNER: 0,
  ADMIN: 1,
  MANAGER: 2,
  MEMBER: 3,
  GUEST: 4,
};

/**
 * fetchChannelMembers — paginates chatMember rows for the given channel.
 *
 * Design decisions:
 *  - Explicit `select` to avoid fetching unused columns and prevent
 *    accidental field leakage when the schema grows.
 *  - In-memory sort by role rank after DB fetch. This is acceptable because
 *    `limit ≤ 100` makes the sort negligible. A raw SQL CASE would work but
 *    adds fragility to schema changes.
 *  - No DataLoader: ChatMemberRecord in SDL has no nested `user` field,
 *    so there is no N+1 concern at the GraphQL resolver level.
 *
 * Errors: DB failures propagate to handler.ts's top-level catch, where they
 * are logged before re-throwing. This step does not catch or wrap them.
 */
export async function fetchChannelMembers(
  input: GetChannelMembersInput,
  ctx: ServiceContext
): Promise<ChannelMemberRow[]> {
  const members = await ctx.db.chatMember.findMany({
    where: { conversationId: input.channelId },
    take: input.limit,
    skip: input.offset,
    select: {
      id: true,
      conversationId: true,
      userId: true,
      lastReadMsgId: true,
      lastDeliveredMsgId: true,
      lastReadSeq: true,
      lastReadAt: true,
      role: true,
      isMuted: true,
      joinedAt: true,
    },
  });

  return members.sort((a, b) => {
    const rankA = ROLE_ORDER[a.role] ?? 99;
    const rankB = ROLE_ORDER[b.role] ?? 99;
    if (rankA !== rankB) return rankA - rankB;
    return a.joinedAt.getTime() - b.joinedAt.getTime();
  });
}
