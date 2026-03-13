import { createLogger } from "@/shared/lib/logger";
import { AppError } from "@/shared/errors";
import type { ServiceContext } from "@/graphql/types";
import type { GetHistoryInput } from "./schema";
import { assertAccess } from "./steps/assert-access";
import { fetchMessages } from "./steps/fetch-messages";
import { buildResponse } from "./steps/build-response";

const log = createLogger("chat:queries:get-history");

/**
 * getHistory — paginated message history fetcher for a conversation.
 *
 * Steps:
 *  1. assertAccess   — authGate + assertChannelMember + permissions.assert
 *  2. fetchMessages  — DB findMany (sequence < beforeSequence, desc, limit+1)
 *  3. buildResponse  — pure: compute hasMore, minSequence (next cursor), slice
 *
 * Pagination is cursor-based using sequence numbers (not offsets). Fetching
 * limit+1 rows avoids a separate COUNT query for hasMore detection.
 *
 * @throws AppError 401  if not authenticated
 * @throws AppError 404  if conversation does not exist
 * @throws AppError 403  if caller is not a channel member or lacks conversation:read
 */
export async function handler(input: GetHistoryInput, ctx: ServiceContext) {
  const { conversationId, beforeSequence } = input;
  const limit = input.limit ?? 50;

  try {
    await assertAccess(conversationId, ctx);

    const messages = await fetchMessages(conversationId, beforeSequence, limit, ctx);

    return buildResponse(messages, limit);
  } catch (err) {
    if (err instanceof AppError) throw err;
    log.error("[get-history] Unexpected failure", { err, conversationId, beforeSequence });
    throw err;
  }
}
