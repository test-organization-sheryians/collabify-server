import { createLogger } from "@/shared/lib/logger";
import { AppError } from "@/shared/errors";
import type { ServiceContext } from "@/graphql/types";
import type { GetReactionUsersInput } from "./schema";
import { assertAccess } from "./steps/assert-access";
import { fetchReactionUsers } from "./steps/fetch-reaction-users";

const log = createLogger("chat:queries:get-reaction-users");

/**
 * getReactionUsers — returns paginated list of users who reacted with a given emoji.
 *
 * Steps:
 *  1. assertAccess       — message → channel auth gate (returns conversationId)
 *  2. fetchReactionUsers — Redis lookup + dataloader batch resolve
 *
 * @throws AppError 401  if not authenticated
 * @throws AppError 404  if message or channel not found
 * @throws AppError 403  if not a member or lacks conversation:read
 */
export const handler = async (
  input: GetReactionUsersInput,
  ctx: ServiceContext
) => {
  try {
    await assertAccess(input.messageId, ctx);
    return await fetchReactionUsers(input, ctx);
  } catch (err) {
    if (err instanceof AppError) throw err;
    log.error("[get-reaction-users] Unexpected failure", {
      err,
      messageId: input.messageId,
    });
    throw err;
  }
};
