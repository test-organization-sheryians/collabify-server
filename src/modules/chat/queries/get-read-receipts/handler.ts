import { createLogger } from "@/shared/lib/logger";
import { AppError } from "@/shared/errors";
import type { ServiceContext } from "@/graphql/types";
import type { GetReadReceiptsInput, ReadReceiptsOutput } from "./schema";
import { assertAccess } from "./steps/assert-access";
import { fetchReadReceipts } from "./steps/fetch-read-receipts";

const log = createLogger("chat:queries:get-read-receipts");

/**
 * getReadReceipts — returns users who have read a message, with Redis-first fallback.
 *
 * Steps:
 *  1. assertAccess      — message → channel auth gate, returns { conversationId, sequence }
 *  2. fetchReadReceipts — Redis reader IDs, then DB watermark fallback
 *
 * @throws AppError 401  if not authenticated
 * @throws AppError 404  if message or channel not found
 * @throws AppError 403  if not a member or lacks conversation:read
 */
export const handler = async (
  input: GetReadReceiptsInput,
  ctx: ServiceContext
): Promise<ReadReceiptsOutput> => {
  try {
    const { conversationId, sequence } = await assertAccess(input.messageId, ctx);
    return await fetchReadReceipts(input.messageId, conversationId, sequence, ctx);
  } catch (err) {
    if (err instanceof AppError) throw err;
    log.error("[get-read-receipts] Unexpected failure", {
      err,
      messageId: input.messageId,
    });
    throw err;
  }
};
