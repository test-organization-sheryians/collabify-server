import { createLogger } from "@/shared/lib/logger";
import type { ServiceContext } from "@/graphql/types";
import type { GetChannelMembersInput } from "./schema";
import { assertAccess } from "./steps/assert-access";
import { fetchChannelMembers } from "./steps/fetch-channel-members";
import { AppError } from "@/shared/errors";

const log = createLogger("chat:queries:get-channel-members");

/**
 * getChannelMembers — returns paginated members of a chat channel.
 *
 * Steps:
 *  1. assertAccess        — verify channel exists, caller is a member (Redis-cached),
 *                           and has conversation.member:read permission (Redis-cached)
 *  2. fetchChannelMembers — DB query with explicit select + role-priority sort
 *                           (OWNER → ADMIN → MANAGER → MEMBER → GUEST)
 *
 * @throws AppError 401  if ctx.authGate / ctx.permissions is missing
 * @throws AppError 404  if channel does not exist
 * @throws AppError 403  if caller is not a channel member or lacks permission
 */
export const handler = async (
  input: GetChannelMembersInput,
  ctx: ServiceContext
) => {
  try {
    await assertAccess(input.channelId, ctx);
    return await fetchChannelMembers(input, ctx);
  } catch (err) {
    if (err instanceof AppError) throw err; // operational — pass through as-is
    log.error("[get-channel-members] Unexpected failure", {
      err,
      channelId: input.channelId,
    });
    throw err; // non-operational — GraphQL layer returns INTERNAL_SERVER_ERROR
  }
};
