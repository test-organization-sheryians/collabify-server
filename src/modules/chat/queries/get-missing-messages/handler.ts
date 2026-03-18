import { createLogger } from "@/shared/lib/logger";
import { AppError } from "@/shared/errors";
import type { ServiceContext } from "@/graphql/types";
import type { GetMissingMessagesInput } from "./schema";
import { assertAccess } from "./steps/assert-access";
import { fetchMissingMessages } from "./steps/fetch-missing-messages";

const log = createLogger("chat:queries:get-missing-messages");

/**
 * getMissingMessages — fetches messages in a ULID range for offline gap recovery.
 *
 * Steps:
 *  1. assertAccess        — channel auth gate
 *  2. fetchMissingMessages — DB findMany (id gte rangeStart, lte rangeEnd) with explicit select
 *
 * @throws AppError 401  if not authenticated
 * @throws AppError 404  if channel not found
 * @throws AppError 403  if not a member or lacks conversation:read
 */
export const handler = async (
  input: GetMissingMessagesInput,
  ctx: ServiceContext
) => {
  try {
    await assertAccess(input.channelId, ctx);
    return await fetchMissingMessages(input, ctx);
  } catch (err) {
    if (err instanceof AppError) throw err;
    log.error("[get-missing-messages] Unexpected failure", {
      err,
      channelId: input.channelId,
    });
    throw err;
  }
};
