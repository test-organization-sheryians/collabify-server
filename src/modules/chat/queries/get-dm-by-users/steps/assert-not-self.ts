import { AppError } from "@/shared/errors";

/**
 * assertNotSelf — guard step that prevents a user from looking up a DM with themselves.
 *
 * Checked before the DB query so the DB is never hit for an invalid request.
 *
 * @throws AppError 400  if userId === otherUserId
 */
export function assertNotSelf(userId: string, otherUserId: string): void {
  if (userId === otherUserId) {
    throw AppError.badRequest("Cannot create DM with yourself");
  }
}
