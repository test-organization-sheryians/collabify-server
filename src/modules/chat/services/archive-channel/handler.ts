import { createLogger } from "@/shared/lib/logger";
import { AppError } from "@/shared/errors";
import type { ServiceContext } from "@/graphql/types";
import type { ArchiveChannelInput } from "./types";
import { assertAccess } from "./steps/assert-access";
import { archive } from "./steps/archive";

const log = createLogger("chat:services:archive-channel");

/**
 * archiveChannel — archives the specific target channel.
 *
 * Steps:
 *  1. assertAccess — asserts authentication and permissions scoped to `chat:channel:archive`.
 *  2. archive      — executes the soft delete `$update` Prisma logic.
 *
 * @throws AppError 401  if not authenticated
 * @throws AppError 404  if channel is unavailable
 * @throws AppError 403  if insufficient permissions
 */
export const handler = async (
  input: ArchiveChannelInput,
  ctx: ServiceContext
) => {
  try {
    if (!ctx.auth?.userId) throw AppError.unauthorized();

    await assertAccess(input.channelId, ctx);
    return await archive(input.channelId, ctx);
  } catch (err) {
    if (err instanceof AppError) throw err;
    log.error("[archive-channel] Unexpected failure", { err, ...input });
    throw new AppError("Failed to archive channel");
  }
};
