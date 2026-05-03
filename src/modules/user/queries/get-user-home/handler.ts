/**
 * getUserHome — Query Handler
 *
 * Returns all data needed for the /home global dashboard:
 *   - User profile snippet
 *   - All workspaces the user belongs to (with their role)
 *   - Pending workspace invites (matched by email)
 */
import type { GetUserHomeInput } from "./types";
import type { ServiceContext } from "@/graphql/types";

export const getUserHome = async (
  input: GetUserHomeInput,
  ctx: ServiceContext
) => {
  const { userId } = input;
  const { db } = ctx;

  // 1. Fetch user (must exist — App Shell guard ensures this)
  const user = await db.user.findUnique({
    where: { id: userId, deletedAt: null },
    select: { id: true, fullName: true, avatarUrl: true, email: true },
  });

  if (!user) return null;

  // 2. Fetch all workspaces user belongs to, including their role name
  const workspaceMemberships = await db.workspaceMember.findMany({
    where: { userId },
    include: {
      workspace: {
        select: { id: true, slug: true, name: true, logoS3Key: true },
      },
      assignedRole: {
        select: { name: true },
      },
    },
    orderBy: { joinedAt: "desc" },
  });

  const workspaces = workspaceMemberships.map((m) => ({
    id: m.workspace.id,
    slug: m.workspace.slug,
    name: m.workspace.name,
    logoUrl: m.workspace.logoS3Key,
    memberRole: m.assignedRole.name,
  }));

  // 3. Fetch pending invites matching user's email
  const pendingInvites = await db.workspaceInvite.findMany({
    where: {
      email: user.email,
      expiresAt: { gt: new Date() },
    },
    include: {
      workspace: { select: { name: true } },
      assignedRole: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const invites = pendingInvites.map((inv) => ({
    id: inv.id,
    token: inv.token,
    workspaceName: inv.workspace.name,
    role: inv.assignedRole.name,
  }));

  return {
    user,
    workspaces,
    pendingInvites: invites,
  };
};
