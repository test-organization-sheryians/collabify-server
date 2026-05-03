/**
 * getMyProjects — Query Handler (thin orchestrator)
 *
 * Auth:
 *   - assertWorkspaceMember — cache-backed; FORBIDDEN if not a workspace member
 *   - permissions.assert("project:read") — RBAC check
 * Steps:
 *   1. [auth] assertWorkspaceMember + assert("project:read") — parallel
 *   2. fetchProjects — load all workspace projects ordered by createdAt desc
 */
import { AppError } from "@/shared/errors";
import type { ServiceContext } from "@/graphql/types";
import type { GetMyProjectsInput } from "./types";
import { fetchProjects } from "./steps/fetch-projects";

export const getMyProjects = async (
  input: GetMyProjectsInput,
  ctx: ServiceContext
) => {
  const { workspaceId, userId } = input;
  const { db } = ctx;

  if (!ctx.authGate || !ctx.permissions) throw AppError.unauthorized();

  const [, isAdmin] = await Promise.all([
    ctx.authGate.assertWorkspaceMember(workspaceId),
    ctx.authGate.isWorkspaceAdminOrAbove(workspaceId),
  ]);

  return fetchProjects(workspaceId, userId, isAdmin, db);
};
