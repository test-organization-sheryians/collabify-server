import { AppError } from "@/shared/errors";
import type { ServiceContext } from "@/graphql/types";
import type { DeleteGroupInput, DeleteGroupOutput } from "./types";
import { assertAccess } from "./steps/assert-access";
import { runDelete } from "./steps/run-delete";

/**
 * Delete Group Handler
 *
 * Steps:
 *  1. assertAccess — maps active scope properties validating mapping limits securely against DB `GROUP_DM` restrictions. Returns member limits securely.
 *  2. runDelete    — deletes map array bounds inherently while asynchronously dispatching `chat:group-deleted` Redis WS hooks across properties securely.
 */
export const handler = async (
  input: DeleteGroupInput,
  ctx: ServiceContext
): Promise<DeleteGroupOutput> => {
  if (!ctx.auth?.userId) {
    throw AppError.unauthorized("User not authenticated");
  }

  const { members } = await assertAccess(input, ctx);
  return await runDelete(input, members, ctx);
};
