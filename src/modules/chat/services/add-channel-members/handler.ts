import { createLogger } from "@/shared/lib/logger";
import { AppError } from "@/shared/errors";
import type { ServiceContext } from "@/graphql/types";
import type { AddChannelMembersInput, AddChannelMembersOutput } from "./types";
import { assertAccess } from "./steps/assert-access";
import { addMembers } from "./steps/add-members";

const log = createLogger("chat:services:add-channel-members");

/**
 * addChannelMembers — registers a bulk array of userIds into a specific target channel.
 *
 * Steps:
 *  1. assertAccess — asserts authentication, retrieves authGate channel instance to fetch `channelName`.
 *  2. addMembers   — performs $transaction bulk mapped member creation & fanout broadcast.
 *
 * @throws AppError 401  if not authenticated
 * @throws AppError 404  if channel is unavailable or invalid type
 * @throws AppError 403  if insufficient `chat:channel:member:add` permissions
 */
export const handler = async (
  input: AddChannelMembersInput,
  ctx: ServiceContext
): Promise<AddChannelMembersOutput> => {
  try {
    if (!ctx.auth?.userId) throw AppError.unauthorized();

    const { channelName } = await assertAccess(input.workspaceId, input.channelId, ctx);
    return await addMembers(input, channelName, ctx);
  } catch (err) {
    if (err instanceof AppError) throw err;
    log.error("[add-channel-members] Unexpected failure", { err, ...input });
    throw err;
  }
};
