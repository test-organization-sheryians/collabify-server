import type { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";

/** Workspace-scoped auth gate for get-unread-counts. */
export async function assertAccess(
  workspaceId: string,
  ctx: ServiceContext
): Promise<void> {
  if (!ctx.authGate) throw AppError.unauthorized();
  await ctx.authGate.assertWorkspaceMember(workspaceId);
}
