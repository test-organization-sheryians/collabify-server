/**
 * Atomically: set newOwner role=OWNER, set actorUserId role=ADMIN.
 * Returns the new owner WorkspaceMember.
 */
import { AppError } from "@/shared/errors";
import type { PrismaClient } from "@prisma/client";

export async function transferInTransaction(
  workspaceId: string,
  actorUserId: string,
  newOwnerId: string,
  db: PrismaClient
) {
  return db.$transaction(async (tx) => {
    const ownerRole = await tx.role.findUnique({
      where: { workspaceId_name: { workspaceId, name: "OWNER" } },
      select: { id: true },
    });
    const adminRole = await tx.role.findUnique({
      where: { workspaceId_name: { workspaceId, name: "ADMIN" } },
      select: { id: true },
    });

    if (!ownerRole || !adminRole) {
      throw new AppError(
        "Workspace roles not configured",
        "INTERNAL_SERVER_ERROR",
        500
      );
    }

    // Demote current owner to ADMIN
    await tx.workspaceMember.update({
      where: { workspaceId_userId: { workspaceId, userId: actorUserId } },
      data: { roleId: adminRole.id },
    });

    // Promote new owner to OWNER
    return tx.workspaceMember.update({
      where: { workspaceId_userId: { workspaceId, userId: newOwnerId } },
      data: { roleId: ownerRole.id },
      include: { user: true, assignedRole: true },
    });
  });
}
