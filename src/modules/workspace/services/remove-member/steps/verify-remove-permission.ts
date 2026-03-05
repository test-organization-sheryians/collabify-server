/**
 * Assert the actor has permission to remove the target member.
 * An actor may remove themselves (self-leave) OR remove others if they are OWNER.
 * Throws FORBIDDEN if neither condition is met.
 */
import { AppError } from "@/shared/errors";
import { RoleType, type WorkspaceMember } from "@prisma/client";

export function verifyRemovePermission(
  actorMember: WorkspaceMember | null,
  targetMember: WorkspaceMember,
  actorUserId: string
): void {
  const isSelf = targetMember.userId === actorUserId;
  const isOwner = actorMember?.role === RoleType.OWNER;

  if (!isSelf && !isOwner) {
    throw AppError.forbidden("Insufficient permissions");
  }
}
