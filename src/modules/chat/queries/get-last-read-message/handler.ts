import { createLogger } from "@/shared/lib/logger";
import { AppError } from "@/shared/errors";
import type { ServiceContext } from "@/graphql/types";
import type { GetLastReadMessageInput } from "./schema";
import { assertAccess } from "./steps/assert-access";
import { fetchLastRead } from "./steps/fetch-last-read";

const log = createLogger("chat:queries:get-last-read-message");

/**
 * getLastReadMessage — returns the last-read message ID for the calling user in a channel.
 *
 * Steps:
 *  1. assertAccess   — authGate + assertChannelMember + permissions.assert("conversation:read")
 *  2. fetchLastRead  — DB chatMember.findUnique → lastReadMsgId scalar
 *
 * Returns null when the user has no read state yet (valid response, not an error).
 *
 * @throws AppError 401  if not authenticated
 * @throws AppError 404  if channel does not exist
 * @throws AppError 403  if not a member or lacks conversation:read
 */
export const handler = async (
  input: GetLastReadMessageInput,
  ctx: ServiceContext
) => {
  try {
    await assertAccess(input.channelId, ctx);

    // Safe: assertAccess guarantees authenticated session before reaching here.
    const userId = ctx.auth.userId ?? "";

    return await fetchLastRead(input.channelId, userId, ctx);
  } catch (err) {
    if (err instanceof AppError) throw err;
    log.error("[get-last-read-message] Unexpected failure", {
      err,
      channelId: input.channelId,
    });
    throw err;
  }
};
