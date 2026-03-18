import { createLogger } from "@/shared/lib/logger";
import { AppError } from "@/shared/errors";
import type { ServiceContext } from "@/graphql/types";
import type { GetMessageByIdInput } from "./schema";
import { fetchMessage } from "./steps/fetch-message";
import { assertAccess } from "./steps/assert-access";

const log = createLogger("chat:queries:get-message-by-id");

/**
 * getMessageById — fetches a single message by ID, verifying channel access.
 *
 * Steps:
 *  1. fetchMessage  — DB findUnique (full select, 1 query total)
 *  2. assertAccess  — pure auth gate using message.conversationId (no extra DB query)
 *
 * Note: fetchMessage runs first so assertAccess can take conversationId directly,
 * making it a pure Redis-backed auth step with zero additional DB queries.
 *
 * @throws AppError 401  if not authenticated
 * @throws AppError 404  if message or conversation not found
 * @throws AppError 403  if not a channel member or lacks conversation:read
 */
export const handler = async (
  input: GetMessageByIdInput,
  ctx: ServiceContext
) => {
  try {
    const message = await fetchMessage(input.messageId, ctx);
    if (!message) throw AppError.notFound("Message not found");

    await assertAccess(message.conversationId, ctx);

    return message;
  } catch (err) {
    if (err instanceof AppError) throw err;
    log.error("[get-message-by-id] Unexpected failure", {
      err,
      messageId: input.messageId,
    });
    throw err;
  }
};
