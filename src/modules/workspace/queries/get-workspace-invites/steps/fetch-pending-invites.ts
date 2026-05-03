/** Fetch all non-expired workspace invites, mapping dates to ISO strings for GraphQL. */
import type { PrismaClient } from "@prisma/client";

export async function fetchPendingInvites(
  workspaceId: string,
  db: PrismaClient
) {
  const invites = await db.workspaceInvite.findMany({
    where: {
      workspaceId,
      expiresAt: { gt: new Date() },
    },
    include: {
      assignedRole: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return invites.map((invite) => ({
    id: invite.id,
    email: invite.email,
    role: invite.assignedRole.name, // role name string (e.g. "MEMBER", "ADMIN")
    roleId: invite.assignedRole.id, // role id string
    expiresAt: invite.expiresAt.toISOString(),
    createdAt: invite.createdAt.toISOString(),
  }));
}
