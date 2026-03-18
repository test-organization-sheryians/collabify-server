import { createLogger } from "@/shared/lib/logger";
import { AppError } from "@/shared/errors";
import type { ServiceContext } from "@/graphql/types";
import type { GetThreadMessagesInput } from "./schema";
import { assertAccess } from "./steps/assert-access";
import { fetchThreadMessages } from "./steps/fetch-thread-messages";

const log = createLogger("chat:queries:get-thread-messages");

/**
 * getThreadMessages — fetches replies to a parent message in chronological order.
 *
 * Steps:
 *  1. assertAccess      — fetches parent message conversationId + channel auth gate
 *  2. fetchThreadMessages — DB findMany (parentMessageId = input.parentMessageId) with explicit select
 *
 * @throws AppError 401  if not authenticated
 * @throws AppError 404  if parent message or conversation not found
 * @throws AppError 403  if not a member or lacks conversation:read
 */
export const handler = async (
  input: GetThreadMessagesInput,
  ctx: ServiceContext
) => {
  try {
    await assertAccess(input.parentMessageId, ctx);
    return await fetchThreadMessages(input, ctx);
  } catch (err) {
    if (err instanceof AppError) throw err;
    log.error("[get-thread-messages] Unexpected failure", {
      err,
      parentMessageId: input.parentMessageId,
    });
    throw err;
  }
};
