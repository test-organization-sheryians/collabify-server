/**
 * Atomically: resolve the workspace role, create the workspace membership,
 * delete the invite, and fetch the workspace slug — all in a single transaction.
 */
import { AppError } from "@/shared/errors";
import type { PrismaClient } from "@prisma/client";

export async function createMembership(
  workspaceId: string,
  userId: string,
  roleName: string,
  token: string,
  db: PrismaClient
) {
  return db.$transaction(async (tx) => {
    // Resolve the Role row for this workspace by name
    const role = await tx.role.findUnique({
      where: { workspaceId_name: { workspaceId, name: roleName } },
    });
    if (!role) {
      throw new AppError(
        `Role "${roleName}" not found in workspace ${workspaceId}`,
        "INTERNAL_SERVER_ERROR",
        500
      );
    }

    await tx.workspaceMember.create({
      data: { workspaceId, userId, roleId: role.id },
    });

    await tx.workspaceInvite.delete({ where: { token } });

    const workspace = await tx.workspace.findUniqueOrThrow({
      where: { id: workspaceId },
      select: { slug: true },
    });

    return {
      success: true,
      message: "Joined workspace successfully",
      workspaceSlug: workspace.slug,
    };
  });
}
