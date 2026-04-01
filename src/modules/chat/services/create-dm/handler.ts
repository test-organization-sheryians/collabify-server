import { AppError } from "@/shared/errors";
import type { ServiceContext } from "@/graphql/types";
import type { CreateDmInput, CreateDmOutput } from "./types";
import { assertAccess } from "./steps/assert-access";
import { create } from "./steps/create";

/**
 * createDm — creates or returns an existing 1:1 DM conversation.
 *
 * Steps:
 *  1. assertAccess — throws self-DM blocks, maps strictly `chat:dm:create`, and maps active project verifications.
 *  2. create       — isolates `LockingService`-free pessimistic `$transaction` array loops securely dodging explicit race constraints via P2002 logic matching.
 */
export const handler = async (
  input: CreateDmInput,
  ctx: ServiceContext
): Promise<CreateDmOutput> => {
  if (!ctx.auth?.userId) throw AppError.unauthorized("User not authenticated");

  await assertAccess(input, ctx);
  return await create(input, ctx);
};
