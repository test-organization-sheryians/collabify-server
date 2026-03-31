/**
 * fetchWorkspaceContext — Step: load the user's resolved roles in a workspace (and optionally a project).
 *
 * Returns workspace role name + project role name (if applicable).
 */
import type { PrismaClient } from "@prisma/client";

interface WorkspaceContextRow {
  workspaceRole: string | null;
  projectRole: string | null;
}

export async function fetchWorkspaceContext(
  userId: string,
  workspaceId: string,
  projectId: string | undefined,
  db: PrismaClient
): Promise<WorkspaceContextRow> {
  // Load workspace membership → role name
  const wsMember = await db.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
    select: { assignedRole: { select: { name: true } } },
  });

  let projectRole: string | null = null;

  if (projectId) {
    const projMember = await db.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
      select: { projectRole: { select: { name: true } } },
    });
    projectRole = projMember?.projectRole?.name ?? null;
  }

  return {
    workspaceRole: wsMember?.assignedRole?.name ?? null,
    projectRole,
  };
}
