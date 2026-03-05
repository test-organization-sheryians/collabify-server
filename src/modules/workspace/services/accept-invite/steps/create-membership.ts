/**
 * Atomically: create the workspace membership, delete the invite,
 * and fetch the workspace slug — all in a single transaction.
 */
import type { PrismaClient } from "@prisma/client";
import type { RoleType } from "@prisma/client";

export async function createMembership(
  workspaceId: string,
  userId: string,
  role: RoleType,
  token: string,
  db: PrismaClient
) {
  return db.$transaction(async (tx) => {
    await tx.workspaceMember.create({
      data: { workspaceId, userId, role },
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
