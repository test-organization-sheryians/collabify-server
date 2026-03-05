/**
 * If the target member is an OWNER, ensure they are not the last owner.
 * Throws BAD_REQUEST if removing them would leave the workspace ownerless.
 */
import { AppError } from "@/shared/errors";
import { RoleType, type WorkspaceMember } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";

export async function guardLastOwner(
  workspaceId: string,
  targetMember: WorkspaceMember,
  db: PrismaClient
): Promise<void> {
  if (targetMember.role !== RoleType.OWNER) return;

  const ownerCount = await db.workspaceMember.count({
    where: { workspaceId, role: RoleType.OWNER },
  });

  if (ownerCount <= 1) {
    throw AppError.badRequest("Cannot remove the last owner");
  }
}
