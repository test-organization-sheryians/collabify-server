import type { ServiceContext } from "@/graphql/types";
import type { GetUnreadCountsInput } from "../schema";

export type MemberSequenceRow = {
  conversationId: string;
  lastReadSeq: number | null;
  conversation: { lastSequence: number | null };
};

/**
 * fetchMemberSequences — fetches all conversation membership rows for the
 * user in the given workspace+project, including last-read and last-message sequences.
 * Used to compute unread counts via Redis pipeline or DB fallback.
 */
export async function fetchMemberSequences(
  input: GetUnreadCountsInput,
  userId: string,
  ctx: ServiceContext
): Promise<MemberSequenceRow[]> {
  return ctx.db.chatMember.findMany({
    where: {
      userId,
      conversation: {
        workspaceId: input.workspaceId,
        projectId: input.projectId,
        deletedAt: null,
      },
    },
    select: {
      conversationId: true,
      lastReadSeq: true,
      conversation: { select: { lastSequence: true } },
    },
  });
}
