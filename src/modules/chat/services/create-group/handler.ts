import { AppError } from "@/shared/errors";
import type { ServiceContext } from "@/graphql/types";
import type { CreateGroupInput, CreateGroupOutput } from "./types";
import { assertAccess } from "./steps/assert-access";
import { create } from "./steps/create";

/**
 * createGroup Handler
 *
 * Steps:
 *  1. assertAccess — throws limits blocking rogue `dm:create` RBAC mappings, runs minimum size/dedupe computations safely.
 *  2. create       — isolates `LockingService` acquisitions securely running nested bounds protections for `GROUP_DM` unique queries natively inside `$transaction`.
 */
export const handler = async (
  input: CreateGroupInput,
  ctx: ServiceContext
): Promise<CreateGroupOutput> => {
  if (!ctx.auth?.userId) throw AppError.unauthorized("User not authenticated");

  const { otherMembers, normalizedName } = await assertAccess(input, ctx);
  return await create(input, otherMembers, normalizedName, ctx);
};
