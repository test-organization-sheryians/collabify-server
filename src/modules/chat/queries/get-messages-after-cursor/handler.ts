import { createLogger } from "@/shared/lib/logger";
import { AppError } from "@/shared/errors";
import type { ServiceContext } from "@/graphql/types";
import type { GetMessagesAfterCursorInput } from "./schema";
import { assertAccess } from "./steps/assert-access";
import { fetchMessagesAfterCursor } from "./steps/fetch-messages-after-cursor";

const log = createLogger("chat:queries:get-messages-after-cursor");

/**
 * getMessagesAfterCursor — fetches messages after a cursor for gap-fill /
 * forward sync (sequence > cursor, ASC order).
 *
 * Steps:
 *  1. assertAccess           — channel auth gate (getChannel + assertChannelMember + permissions.assert)
 *  2. fetchMessagesAfterCursor — DB findMany with cursor + explicit select
 *
 * @throws AppError 401  if not authenticated
 * @throws AppError 404  if channel not found
 * @throws AppError 403  if not a member or lacks conversation:read
 */
export const handler = async (
  input: GetMessagesAfterCursorInput,
  ctx: ServiceContext
) => {
  try {
    await assertAccess(input.channelId, ctx);
    return await fetchMessagesAfterCursor(input, ctx);
  } catch (err) {
    if (err instanceof AppError) throw err;
    log.error("[get-messages-after-cursor] Unexpected failure", {
      err,
      channelId: input.channelId,
    });
    throw err;
  }
};
