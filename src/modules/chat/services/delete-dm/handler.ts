import { AppError } from "@/shared/errors";
import type { ServiceContext } from "@/graphql/types";
import type { DeleteDmInput, DeleteDmOutput } from "./types";
import { assertAccess } from "./steps/assert-access";
import { runDelete } from "./steps/run-delete";

/**
 * Delete Dm Handler
 *
 * Steps:
 *  1. assertAccess — maps active RBAC checks verifying `.findFirst` boundaries confirming target strictly maps to `TYPE: 'DM'`, and extracts explicitly authorized array payloads natively tracking participants.
 *  2. runDelete    — strictly resolves global destruction hooks while fanning `chat:dm-deleted` payload websocket emissions cleanly safely.
 */
export const handler = async (
  input: DeleteDmInput,
  ctx: ServiceContext
): Promise<DeleteDmOutput> => {
  if (!ctx.auth?.userId) {
    throw AppError.unauthorized("User not authenticated");
  }

  const { members } = await assertAccess(input, ctx);
  return await runDelete(input, members, ctx);
};
