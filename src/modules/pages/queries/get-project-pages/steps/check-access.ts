/**
 * Step 1 — Check Access
 *
 * Verifies the project exists and the requesting user is a workspace member.
 * Returns the workspaceId so the caller doesn't need a second project lookup.
 *
 * Access model: any workspace member can read all project pages.
 * Per-page collaborator records are only enforced by mutation handlers.
 */

import { AppError } from "@/shared/errors";
import type { PrismaClient } from "@prisma/client";

export async function checkAccess(
  projectId: string,
  userId: string,
  db: PrismaClient
): Promise<{ workspaceId: string }> {
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { workspaceId: true },
  });
  if (!project) throw AppError.notFound("Project not found");

  const member = await db.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: project.workspaceId, userId } },
    select: { id: true },
  });
  if (!member)
    throw AppError.forbidden("You are not a member of this workspace");

  return { workspaceId: project.workspaceId };
}
