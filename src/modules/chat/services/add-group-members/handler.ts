import { createLogger } from "@/shared/lib/logger";
import { AppError } from "@/shared/errors";
import type { ServiceContext } from "@/graphql/types";
import type { AddGroupMembersInput, AddGroupMembersOutput } from "./types";
import { assertAccess } from "./steps/assert-access";
import { addMembers } from "./steps/add-members";

const log = createLogger("chat:services:add-group-members");

/**
 * addGroupMembers — registers a bulk array of userIds into a specific target GROUP_DM.
 *
 * Steps:
 *  1. assertAccess — asserts authentication, retrieves authGate channel instance to fetch `groupName`.
 *  2. addMembers   — performs $transaction bulk mapped member creation & fanout broadcast.
 *
 * @throws AppError 401  if not authenticated
 * @throws AppError 404  if group is unavailable or invalid type
 * @throws AppError 403  if insufficient `chat:channel:member:add` permissions
 */
export const handler = async (
  input: AddGroupMembersInput,
  ctx: ServiceContext
): Promise<AddGroupMembersOutput> => {
  try {
    if (!ctx.auth?.userId) throw AppError.unauthorized();

    const { groupName } = await assertAccess(input.workspaceId, input.groupId, ctx);
    return await addMembers(input, groupName, ctx);
  } catch (err) {
    if (err instanceof AppError) throw err;
    log.error("[add-group-members] Unexpected failure", { err, ...input });
    throw err;
  }
};
