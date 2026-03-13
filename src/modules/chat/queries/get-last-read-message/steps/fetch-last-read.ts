import type { ServiceContext } from "@/graphql/types";

/**
 * fetchLastRead — returns the last-read message ID for the calling user in a channel.
 *
 * Returns null when:
 *  - The caller has no chatMember row in this channel (should not happen — auth gate
 *    already verified membership, but defensive null propagation is safer than throwing)
 *  - The member exists but has never read any message (lastReadMsgId is null)
 *
 * Uses nullish coalescing (??) not OR (||) so an empty-string ID (however unlikely)
 * is not coalesced away.
 */
export async function fetchLastRead(
  channelId: string,
  userId: string,
  ctx: ServiceContext
): Promise<string | null> {
  const member = await ctx.db.chatMember.findUnique({
    where: {
      conversationId_userId: {
        conversationId: channelId,
        userId,
      },
    },
    select: {
      lastReadMsgId: true,
    },
  });

  return member?.lastReadMsgId ?? null;
}
