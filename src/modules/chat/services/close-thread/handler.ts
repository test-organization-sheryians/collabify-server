import { createLogger } from "@/shared/lib/logger";
import { AppError } from "@/shared/errors";
import type { ServiceContext } from "@/graphql/types";
import type { CloseThreadInput, CloseThreadOutput } from "./types";
import { assertAccess } from "./steps/assert-access";
import { close } from "./steps/close";

const log = createLogger("chat:services:close-thread");

/**
 * Close Thread Handler
 *
 * Marks a thread as closed. No new messages allowed (enforced at send-message level).
 *
 * Steps:
 *  1. assertAccess — asserts authentication, permissions scoped to `chat:channel:update`, and validates active thread members.
 *  2. close        — executes the `$update` Prisma timestamp logic and publishes the Redis fanout limit.
 */
export const handler = async (
  input: CloseThreadInput,
  ctx: ServiceContext
): Promise<CloseThreadOutput> => {
  try {
    if (!ctx.auth?.userId) throw AppError.unauthorized();

    const members = await assertAccess(input, ctx);
    return await close(input, members, ctx);
  } catch (err) {
    if (err instanceof AppError) throw err;
    log.error("[close-thread] Unexpected failure", { err, ...input });
    throw new AppError("Failed to close thread");
  }
};
