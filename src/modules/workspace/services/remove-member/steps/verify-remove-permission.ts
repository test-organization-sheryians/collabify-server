/**
 * Assert the actor has permission to remove the target member.
 * An actor may remove themselves (self-leave) OR remove others if they are OWNER.
 * Throws FORBIDDEN if neither condition is met.
 */
import { AppError } from "@/shared/errors";
import type { Role, WorkspaceMember } from "@prisma/client";

type MemberWithRole = WorkspaceMember & { assignedRole: Role };

export function verifyRemovePermission(
  actorMember: MemberWithRole | null,
  targetMember: MemberWithRole,
  actorUserId: string
): void {
  const isSelf = targetMember.userId === actorUserId;
  const isOwner = actorMember?.assignedRole.name === "OWNER";

  if (!isSelf && !isOwner) {
    throw AppError.forbidden("Insufficient permissions");
  }
}
