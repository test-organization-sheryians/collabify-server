import { AppError } from "@/shared/errors";
import type { ServiceContext } from "@/graphql/types";

/**
 * assertAuthenticated — early exit guard used as the first step in every handler.
 *
 * After integration, handlers use ctx.auth.userId directly.
 * This guard ensures a non-null userId before any check.
 */
export function assertAuthenticated(
  ctx: ServiceContext
): asserts ctx is ServiceContext & {
  auth: NonNullable<ServiceContext["auth"]>;
} {
  // Once AuthGate is integrated into ServiceContext, ctx.auth.userId is the source of truth
  const userId = ctx.auth?.userId;
  if (!userId) {
    throw AppError.unauthorized("Not authenticated.");
  }
}
