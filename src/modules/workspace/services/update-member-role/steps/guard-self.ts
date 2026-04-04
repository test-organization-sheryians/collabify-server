/**
 * guardSelf — prevents an actor from modifying their own workspace role.
 */
import { AppError } from "@/shared/errors";

export async function guardSelf(
  actorUserId: string,
  targetMemberUserId: string
): Promise<void> {
  if (actorUserId === targetMemberUserId) {
    throw AppError.forbidden("You cannot change your own role.");
  }
}
