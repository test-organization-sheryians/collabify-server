/**
 * getWorkspaceOverview — Query Handler (thin orchestrator)
 *
 * Returns a full workspace snapshot in one round-trip:
 *   - Counts (projects, members, issues, pages, channels)
 *   - Top 5 recently active projects with open issue + member counts
 *   - Last 5 members to join
 *   - Top 5 URGENT open issues across all projects
 *
 * Auth:
 *   - assertWorkspaceMember(workspaceId)
 *   - permissions.assert("workspace:read", workspaceScope)
 */
import { AppError } from "@/shared/errors";
import type { GetWorkspaceOverviewInput } from "./schema";
import type { ServiceContext } from "@/graphql/types";
import { fetchWorkspaceOverview } from "./steps/fetch-workspace-overview";

export const getWorkspaceOverview = async (
  input: GetWorkspaceOverviewInput,
  ctx: ServiceContext
) => {
  const { workspaceId } = input;

  if (!ctx.authGate || !ctx.permissions) throw AppError.unauthorized();

  const scope = { type: "workspace" as const, id: workspaceId };
  await Promise.all([
    ctx.authGate.assertWorkspaceMember(workspaceId),
    ctx.permissions.assert("workspace:read", scope),
  ]);

  return fetchWorkspaceOverview(workspaceId, ctx.db);
};
