/**
 * Guard: user cannot delete their account if they are the sole OWNER
 * of any workspace. They must transfer ownership or delete the workspace first.
 */
import { AppError } from "@/shared/errors";
import type { PrismaClient } from "@prisma/client";

export async function verifyNotSoleOwnerAnywhere(
  userId: string,
  db: PrismaClient
): Promise<void> {
  // Workspaces where this user is the only OWNER
  const ownedWorkspaces = await db.workspaceMember.findMany({
    where: { userId, assignedRole: { name: "OWNER" } },
    select: { workspaceId: true },
  });

  for (const { workspaceId } of ownedWorkspaces) {
    const ownerCount = await db.workspaceMember.count({
      where: { workspaceId, assignedRole: { name: "OWNER" } },
    });
    if (ownerCount <= 1) {
      throw AppError.badRequest(
        "Cannot delete account — you are the sole owner of at least one workspace. Transfer ownership or delete the workspace first."
      );
    }
  }
}
