import type { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import type { CreateDmInput } from "../types";

/**
 * assertAccess logic for create-dm.
 * Strictly checks that the initiating user avoids self-DMs, validates Project activity rules 
 * (deleted projects, archived projects), ensures workspace compatibility,
 * and asserts that the `chat:dm:create` project role matches.
 */
export async function assertAccess(
  input: CreateDmInput,
  ctx: ServiceContext
): Promise<void> {
  if (!ctx.authGate || !ctx.permissions || !ctx.auth?.userId) {
    throw AppError.unauthorized();
  }

  const { userId } = ctx.auth;
  const { workspaceId, projectId, recipientUserId } = input;

  // Guard: cannot DM yourself
  if (userId === recipientUserId) {
    throw AppError.badRequest("Cannot create DM with yourself");
  }

  // Auth: caller must be a project member with conversation:create
  const proj = await ctx.authGate.getProject(projectId);
  const scope = {
    type: "project" as const,
    id: projectId,
    workspaceId: proj?.workspaceId ?? workspaceId,
  };
  await Promise.all([
    ctx.authGate.assertProjectMember(projectId),
    ctx.permissions.assert("chat:dm:create", scope),
  ]);

  // Validate project is active
  const project = await ctx.db.project.findUnique({
    where: { id: projectId },
    select: { id: true, isArchived: true, deletedAt: true, workspaceId: true },
  });

  if (!project) throw AppError.notFound("Project not found");
  if (project.deletedAt) {
    throw AppError.badRequest("Cannot create DM in deleted project");
  }
  if (project.isArchived) {
    throw AppError.badRequest("Cannot create DM in archived project");
  }
  if (project.workspaceId !== workspaceId) {
    throw AppError.badRequest("Project does not belong to this workspace");
  }
}
