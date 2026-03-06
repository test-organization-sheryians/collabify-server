/**
 * If the target member is an OWNER, ensure they are not the last owner.
 * Throws BAD_REQUEST if removing them would leave the workspace ownerless.
 */
import { AppError } from "@/shared/errors";
import type { Role, WorkspaceMember } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";

type MemberWithRole = WorkspaceMember & { assignedRole: Role };

export async function guardLastOwner(
  workspaceId: string,
  targetMember: MemberWithRole,
  db: PrismaClient
): Promise<void> {
  if (targetMember.assignedRole.name !== "OWNER") return;

  const ownerCount = await db.workspaceMember.count({
    where: { workspaceId, assignedRole: { name: "OWNER" } },
  });

  if (ownerCount <= 1) {
    throw AppError.badRequest("Cannot remove the last owner");
  }
}
