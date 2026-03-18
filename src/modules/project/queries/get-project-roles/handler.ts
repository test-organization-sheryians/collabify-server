/**
 * getProjectRoles — Query Handler (thin orchestrator)
 *
 * Auth:
 *   - assertProjectMember — any member can list roles (needed for role picker UI)
 * Steps:
 *   1. [auth] assertProjectMember
 *   2. fetchProjectRoles — return all PROJECT-scoped roles (sorted system-first, then rank desc)
 */
import { AppError } from "@/shared/errors";
import type { GetProjectRolesInput } from "./schema";
import type { ServiceContext } from "@/graphql/types";
import { fetchProjectRoles } from "./steps/fetch-project-roles";

export const getProjectRoles = async (
  input: GetProjectRolesInput,
  ctx: ServiceContext
) => {
  const { projectId, workspaceId } = input;
  if (!ctx.authGate) throw AppError.unauthorized();
  await ctx.authGate.assertProjectMember(projectId);
  return fetchProjectRoles(projectId, workspaceId, ctx.db);
};
