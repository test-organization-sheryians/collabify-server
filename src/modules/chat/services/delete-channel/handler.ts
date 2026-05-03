import { AppError } from "@/shared/errors";
import type { ServiceContext } from "@/graphql/types";
import type { DeleteChannelInput, DeleteChannelOutput } from "./types";
import { assertAccess } from "./steps/assert-access";
import { runDelete } from "./steps/run-delete";

/**
 * Delete Channel Handler
 *
 * Permanently deletes a channel (hard delete).
 *
 * Steps:
 *  1. assertAccess — maps active RBAC paths protecting deletions solely restricting un-archived target deletions.
 *  2. runDelete    — destructs `chatConversation` mapping triggers universally cascaded over members/messages.
 */
export const handler = async (
  input: DeleteChannelInput,
  ctx: ServiceContext
): Promise<DeleteChannelOutput> => {
  if (!ctx.auth?.userId) {
    throw AppError.unauthorized("User not authenticated");
  }

  await assertAccess(input, ctx);
  return await runDelete(input, ctx);
};
