/**
 * Step: Validate Access
 *
 * Checks:
 * 1. User is workspace member
 * 2. User is project member
 * 3. RBAC: project:member:read permission
 */
import type { ServiceContext } from "@/graphql/types";

export async function validateAccess(
  projectId: string,
  actorUserId: string,
  ctx: ServiceContext
): Promise<void> {
  if (!ctx.authGate || !ctx.permissions) throw new Error("Auth context not available");

  const project = await ctx.authGate.getProject(projectId);
  if (!project) throw new Error("Project not found");

  const scope = {
    type: "project" as const,
    id: projectId,
    workspaceId: project.workspaceId,
  };

  await Promise.all([
    ctx.authGate.assertWorkspaceMember(project.workspaceId),
    ctx.authGate.assertProjectMember(projectId),
    ctx.permissions.assert("project:member:read", scope),
  ]);
}
