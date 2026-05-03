import type { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";

/**
 * assertAccess logic for check-channel-availability.
 * Explicitly guards boundary purely by checking existence of an authenticated user map.
 */
export async function assertAccess(ctx: ServiceContext): Promise<void> {
  if (!ctx.auth?.userId) {
    throw AppError.unauthorized("User not authenticated");
  }
}
