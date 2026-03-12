import { AppError } from "@/shared/errors";

/**
 * assertOwnership — generic creator ownership check.
 * Throws FORBIDDEN if the resource was not created by the current user.
 *
 * Use for simple "own resource" guards. For complex conditions,
 * use ctx.permissions.assertWithContext() with a conditions block.
 */
export function assertOwnership(
  resourceCreatedBy: string,
  userId: string,
  resourceLabel = "resource"
): void {
  if (resourceCreatedBy !== userId) {
    throw AppError.forbidden(`You do not own this ${resourceLabel}.`);
  }
}
