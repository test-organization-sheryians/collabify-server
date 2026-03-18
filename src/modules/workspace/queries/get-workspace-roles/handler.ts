/**
 * getWorkspaceRoles — Query Handler (thin orchestrator)
 *
 * Auth:
 *   - assertWorkspaceMember — any member can list roles (needed for role picker UI)
 * Steps:
 *   1. [auth] assertWorkspaceMember
 *   2. fetchWorkspaceRoles — return all WORKSPACE-scoped roles (projectId=null)
 */
import { AppError } from "@/shared/errors";
import type { GetWorkspaceRolesInput } from "./schema";
import type { ServiceContext } from "@/graphql/types";
import { fetchWorkspaceRoles } from "./steps/fetch-workspace-roles";

export const getWorkspaceRoles = async (
  input: GetWorkspaceRolesInput,
  ctx: ServiceContext
) => {
  const { workspaceId } = input;
  if (!ctx.authGate) throw AppError.unauthorized();
  await ctx.authGate.assertWorkspaceMember(workspaceId);
  return fetchWorkspaceRoles(workspaceId, ctx.db);
};
