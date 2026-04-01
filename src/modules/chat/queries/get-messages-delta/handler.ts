import { createLogger } from "@/shared/lib/logger";
import { AppError } from "@/shared/errors";
import type { ServiceContext } from "@/graphql/types";
import type { GetMessagesDeltaInput } from "./schema";
import { assertAccess } from "./steps/assert-access";
import { fetchDelta } from "./steps/fetch-delta";
import { buildDeltaResponse } from "./steps/build-delta-response";

const log = createLogger("chat:queries:get-messages-delta");

/**
 * getMessagesDelta — fetches messages after a sequence cursor for sync recovery.
 *
 * Steps:
 *  1. assertAccess      — channel-scoped auth gate
 *  2. fetchDelta        — DB findMany (sequence > afterSequence, limit+1 look-ahead)
 *  3. buildDeltaResponse — hasMore + lastSequence (fixed || → ??)
 *
 * @throws AppError 401  if not authenticated
 * @throws AppError 404  if conversation not found
 * @throws AppError 403  if not a member or lacks conversation:read
 */
export const handler = async (
  input: GetMessagesDeltaInput,
  ctx: ServiceContext
) => {
  try {
    if (!ctx.auth?.userId) throw AppError.unauthorized();
    await assertAccess(input.conversationId, ctx);
    const messages = await fetchDelta(input, ctx);
    return buildDeltaResponse(messages, input.limit ?? 50, input.afterSequence);
  } catch (err) {
    if (err instanceof AppError) throw err;
    log.error("[get-messages-delta] Unexpected failure", {
      err,
      conversationId: input.conversationId,
    });
    throw err;
  }
};
