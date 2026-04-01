import type { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";

/**
 * assertAccess for get-project-dms.
 * Auth gate: caller must be authenticated + project member, plus they must
 * have the specific `chat:channel:read` permission over the project.
 */
export async function assertAccess(
  projectId: string,
  workspaceId: string,
  ctx: ServiceContext
): Promise<void> {
  if (!ctx.authGate || !ctx.permissions || !ctx.auth?.userId) {
    throw AppError.unauthorized();
  }

  await Promise.all([
    ctx.authGate.assertProjectMember(projectId),
    ctx.permissions.assert("chat:channel:read", {
      type: "project",
      id: projectId,
      workspaceId,
    }),
  ]);
}
