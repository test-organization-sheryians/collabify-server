import { createLogger } from "@/shared/lib/logger";
import { AppError } from "@/shared/errors";
import type { ServiceContext } from "@/graphql/types";
import type { CheckChannelAvailabilityInput, ChannelAvailabilityResponse } from "./types";
import { assertAccess } from "./steps/assert-access";
import { checkAvailability } from "./steps/check-availability";

const log = createLogger("chat:services:check-channel-availability");

/**
 * checkChannelAvailability — global reserved availability ping
 *
 * Steps:
 *  1. assertAccess       — maps early !ctx.auth?.userId protection.
 *  2. checkAvailability  — manages limits, DB assertions, and Redis lock rolling.
 *
 * @throws AppError 401  if not authenticated
 */
export const handler = async (
  input: CheckChannelAvailabilityInput,
  ctx: ServiceContext
): Promise<ChannelAvailabilityResponse> => {
  try {
    if (!ctx.auth?.userId) throw AppError.unauthorized();

    await assertAccess(ctx);
    return await checkAvailability(input, ctx);
  } catch (err) {
    if (err instanceof AppError) throw err;
    log.error("[check-channel-availability] Unexpected failure", { err, ...input });
    throw err;
  }
};
