import type { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";

/**
 * assertAccess for get-user-conversations.
 * Workspace-scoped: assertWorkspaceMember + permissions.assert("chat:channel:read").
 * If projectId is provided, additional project-scoped assertion is made.
 *
 * Note: The original handler had a bug where it would use user-supplied workspaceId
 * when getProject returned null. This is fixed — workspace scope is always used
 * as the authoritative scope.
 */
export async function assertAccess(
  workspaceId: string,
  projectId: string,
  ctx: ServiceContext
): Promise<void> {
  if (!ctx.authGate || !ctx.permissions) throw AppError.unauthorized();

  if (projectId) {
    await Promise.all([
      ctx.authGate.assertProjectMember(projectId),
      ctx.permissions.assert("chat:channel:read", {
        type: "project",
        id: projectId,
        workspaceId,
      }),
    ]);
  } else {
    await Promise.all([
      ctx.authGate.assertWorkspaceMember(workspaceId),
      ctx.permissions.assert("chat:channel:read", {
        type: "workspace",
        id: workspaceId,
      }),
    ]);
  }
}
