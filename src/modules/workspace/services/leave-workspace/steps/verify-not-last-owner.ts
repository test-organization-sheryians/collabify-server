/** Guard: OWNER cannot self-leave — they must transfer ownership first. */
import { AppError } from "@/shared/errors";
import type { PrismaClient } from "@prisma/client";

export async function verifyNotLastOwner(
  workspaceId: string,
  actorUserId: string,
  db: PrismaClient
): Promise<void> {
  const member = await db.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: actorUserId } },
    include: { assignedRole: true },
  });

  if (!member) {
    throw AppError.notFound("You are not a member of this workspace");
  }

  if (member.assignedRole.name !== "OWNER") return;

  // OWNER may leave only if they are not the last OWNER
  const ownerCount = await db.workspaceMember.count({
    where: { workspaceId, assignedRole: { name: "OWNER" } },
  });

  if (ownerCount <= 1) {
    throw AppError.badRequest(
      "Cannot leave — you are the sole owner. Transfer ownership before leaving."
    );
  }
}
