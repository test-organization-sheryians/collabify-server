import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import type { DeleteThreadInput, DeleteThreadOutput } from "./types";
import { assertAccess } from "./steps/assert-access";
import { runDelete } from "./steps/run-delete";

/**
 * handler for delete-thread.
 * Orchestrates authorization, validation, and deletion steps.
 */
export const handler = async (
  input: DeleteThreadInput,
  ctx: ServiceContext
): Promise<DeleteThreadOutput> => {
  if (!ctx.auth?.userId) {
    throw AppError.unauthorized("User not authenticated");
  }

  const { members } = await assertAccess(input, ctx);
  return await runDelete(input, members, ctx);
};
