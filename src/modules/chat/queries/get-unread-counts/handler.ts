import { createLogger } from "@/shared/lib/logger";
import { AppError } from "@/shared/errors";
import type { ServiceContext } from "@/graphql/types";
import type { GetUnreadCountsInput, GetUnreadCountsOutput } from "./schema";
import { assertAccess } from "./steps/assert-access";
import { fetchMemberSequences } from "./steps/fetch-member-sequences";

const log = createLogger("chat:queries:get-unread-counts");

/**
 * getUnreadCounts — computes unread message counts for all user conversations
 * in a workspace+project via Redis pipeline with DB fallback.
 *
 * Steps:
 *  1. assertAccess          — workspace-scoped: assertWorkspaceMember only
 *  2. fetchMemberSequences  — DB chatMember rows (lastReadSeq + conversation.lastSequence)
 *  3. Redis pipeline        — batch zscore for user read watermarks
 *  4. compute+return        — Math.max(0, lastMsgSeq - userReadSeq) per conversation
 *
 * @throws AppError 401  if not authenticated or not workspace member
 */
export const handler = async (
  input: GetUnreadCountsInput,
  ctx: ServiceContext
): Promise<GetUnreadCountsOutput> => {
  const userId = ctx.auth.userId!;

  try {
    await assertAccess(input.workspaceId, ctx);
    const members = await fetchMemberSequences(input, userId, ctx);

    // Batch fetch read watermarks from Redis (single pipeline)
    const pipeline = ctx.redis.pipeline();
    members.forEach((member) => {
      pipeline.zscore(`read:${member.conversationId}`, userId);
    });
    const results = await pipeline.exec();

    const conversations = members.map((member, index) => {
      const redisScore = results?.[index]?.[1];
      const userReadSeq = redisScore
        ? parseInt(redisScore as string)
        : (member.lastReadSeq ?? 0);

      const lastMsgSeq = member.conversation.lastSequence ?? 0;
      const unreadCount = Math.max(0, lastMsgSeq - userReadSeq);

      return {
        conversationId: member.conversationId,
        unreadCount,
        lastUnreadMessageId: null,
      };
    });

    return { conversations };
  } catch (err) {
    if (err instanceof AppError) throw err;
    log.error("[get-unread-counts] Unexpected failure", {
      err,
      workspaceId: input.workspaceId,
    });
    throw err;
  }
};
