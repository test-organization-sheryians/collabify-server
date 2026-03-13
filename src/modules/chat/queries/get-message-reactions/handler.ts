import { createLogger } from "@/shared/lib/logger";
import { AppError } from "@/shared/errors";
import type { ServiceContext } from "@/graphql/types";
import type { GetMessageReactionsInput } from "./schema";
import { fetchMessageConversation } from "./steps/fetch-message-conversation";
import { assertAccess } from "./steps/assert-access";
import { fetchReactions } from "./steps/fetch-reactions";

const log = createLogger("chat:queries:get-message-reactions");

/**
 * getMessageReactions — returns all reaction groups for a message with user previews.
 *
 * Steps:
 *  1. fetchMessageConversation — resolves conversationId from messageId (1 DB query)
 *  2. assertAccess             — pure Redis-backed auth gate (no DB queries)
 *  3. fetchReactions           — Redis-first with DB rebuild fallback + distributed lock
 *
 * @throws AppError 401  if not authenticated
 * @throws AppError 404  if message or conversation not found
 * @throws AppError 403  if not a member or lacks conversation:read
 */
export const handler = async (
  input: GetMessageReactionsInput,
  ctx: ServiceContext
) => {
  const userId = ctx.auth.userId!;

  try {
    const { conversationId } = await fetchMessageConversation(input.messageId, ctx);
    await assertAccess(conversationId, ctx);
    return await fetchReactions(input.messageId, userId, ctx);
  } catch (err) {
    if (err instanceof AppError) throw err;
    log.error("[get-message-reactions] Unexpected failure", {
      err,
      messageId: input.messageId,
    });
    throw err;
  }
};
