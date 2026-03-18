/** Assert the invite email matches the authenticated user's email. Throws FORBIDDEN if not. */
import { AppError } from "@/shared/errors";

export function verifyInviteEmail(
  inviteEmail: string,
  userEmail: string
): void {
  if (inviteEmail !== userEmail) {
    throw AppError.forbidden("INVITE_EXPIRED");
  }
}
