/**
 * Step 2 — Check Access
 *
 * Two-path access gate:
 *   Path A (fast): caller has a pageCollaborator record → allowed
 *   Path B (slow): caller is a workspaceMember → allowed (workspace-wide read access)
 *   Neither → FORBIDDEN
 *
 * WHY two paths:
 * Pages can be shared with specific collaborators (via addPageCollaborators) but
 * all workspace members can also browse the page tree. Workspace membership is
 * the broader access level; collaboratorship gives write permissions (controlled
 * by mutations checking role === 'EDITOR').
 */

import { AppError } from "@/shared/errors";
import type { PrismaClient } from "@prisma/client";

export async function checkAccess(
  pageId: string,
  workspaceId: string,
  userId: string,
  db: PrismaClient
): Promise<void> {
  // Path A — direct collaborator (most common path)
  const collab = await db.pageCollaborator.findUnique({
    where: { pageId_userId: { pageId, userId } },
    select: { id: true },
  });
  if (collab) return;

  // Path B — workspace member
  const member = await db.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
    select: { id: true },
  });
  if (!member) throw AppError.forbidden("You do not have access to this page");
}
