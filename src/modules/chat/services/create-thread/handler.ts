import { AppError } from "@/shared/errors";
import type { ServiceContext } from "@/graphql/types";
import type { CreateThreadInput, CreateThreadOutput } from "./types";
import { assertAccess } from "./steps/assert-access";
import { create } from "./steps/create";

/**
 * createThread Handler
 *
 * Steps:
 *  1. assertAccess — throws limit boundaries blocking reply threads matching active target boundaries against DB properties sequentially.
 *  2. create       — isolates native idempotency checking safely through `LockingService` bounds while maintaining `.increment(1)` properties mapping to core target targets natively.
 */
export const handler = async (
  input: CreateThreadInput,
  ctx: ServiceContext
): Promise<CreateThreadOutput> => {
  if (!ctx.auth?.userId) {
    throw new AppError("User not authenticated", "UNAUTHORIZED", 401);
  }

  await assertAccess(input, ctx);
  return await create(input, ctx);
};
