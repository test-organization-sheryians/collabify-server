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
    orderBy: { createdAt: "desc" },
  });

  return invites.map((invite) => ({
    id: invite.id,
    email: invite.email,
    role: invite.role,
    expiresAt: invite.expiresAt.toISOString(),
    createdAt: invite.createdAt.toISOString(),
  }));
}
