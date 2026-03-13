import { createLogger } from "@/shared/lib/logger";
import { AppError } from "@/shared/errors";
import type { ServiceContext } from "@/graphql/types";
import type { GetConversationInput } from "./schema";
import { assertAccess } from "./steps/assert-access";
import { fetchConversation } from "./steps/fetch-conversation";
import { fetchUnreadCount } from "./steps/fetch-unread-count";
import { fetchLastMessage } from "./steps/fetch-last-message";
import { buildResponse } from "./steps/build-response";

const log = createLogger("chat:queries:get-conversation");

/**
 * getConversation — returns a single conversation with members, unread count,
 * and last message preview.
 *
 * Steps:
 *  1. assertAccess       — auth gate (authGate null-check, getChannel, assertChannelMember,
 *                          permissions.assert) — all Redis-cached
 *  2. fetchConversation  — single DB query with explicit select; no redundant membership filter
 *  3. fetchLastMessage   — chatMessage.findFirst(desc) for preview   ┐ parallelised
 *  4. fetchUnreadCount   — chatMessage.count(seq > lastReadSeq ?? 0)
 *  5. buildResponse      — pure mapping: DB rows → Conversation GQL type
 *
 * @throws AppError 401  if ctx.authGate / ctx.permissions is missing
 * @throws AppError 404  if conversation does not exist
 * @throws AppError 403  if caller is not a member or lacks conversation:read permission
 */
export const handler = async (
  input: GetConversationInput,
  ctx: ServiceContext
) => {
  try {
    await assertAccess(input.conversationId, ctx);

    // fetchConversation and fetchLastMessage are independent DB reads — run in parallel.
    const [conversation, lastMessage] = await Promise.all([
      fetchConversation(input.conversationId, ctx),
      fetchLastMessage(input.conversationId, ctx),
    ]);

    // Safe: assertAccess guarantees an authenticated session before reaching here.
    const userId = ctx.auth.userId!;
    const userMember = conversation.members.find((m) => m.userId === userId);
    const unreadCount = await fetchUnreadCount(
      input.conversationId,
      userMember?.lastReadSeq ?? null,
      ctx
    );

    return buildResponse(conversation, unreadCount, lastMessage, userId);
  } catch (err) {
    if (err instanceof AppError) throw err; // operational — pass through as-is
    log.error("[get-conversation] Unexpected failure", {
      err,
      conversationId: input.conversationId,
    });
    throw err; // non-operational — GraphQL layer returns INTERNAL_SERVER_ERROR
  }
};
