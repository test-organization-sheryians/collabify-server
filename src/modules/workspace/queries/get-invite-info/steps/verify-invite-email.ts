/**
 * If the caller's email is known, assert it matches the invite email.
 * Throws FORBIDDEN if there is a mismatch.
 */
import { AppError } from "@/shared/errors";

export function verifyInviteEmail(
  inviteEmail: string,
  userEmail: string | undefined
): void {
  if (userEmail && inviteEmail !== userEmail) {
    throw AppError.forbidden("INVITE_EXPIRED");
  }
}
