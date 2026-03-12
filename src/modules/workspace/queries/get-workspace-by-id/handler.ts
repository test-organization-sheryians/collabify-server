/**
 * getWorkspaceById — Query Handler (thin orchestrator)
 *
 * Auth:
 *   - assertWorkspaceMember — cache-backed; FORBIDDEN if not a member
 *   - permissions.assert("workspace:read") — RBAC check
 * Steps:
 *   1. [auth] assertWorkspaceMember + assert("workspace:read") — parallel
 *   2. fetchWorkspaceById — NOT_FOUND if workspace missing or deleted
 */
import { AppError } from "@/shared/errors";
import type { GetWorkspaceByIdInput } from "./schema";
import type { ServiceContext } from "@/graphql/types";
import { fetchWorkspaceById } from "./steps/fetch-workspace-by-id";

export const getWorkspaceById = async (
  input: GetWorkspaceByIdInput,
  ctx: ServiceContext
) => {
  const { workspaceId, actorUserId } = input;
  const { db } = ctx;

  if (!ctx.authGate || !ctx.permissions) throw AppError.unauthorized();
  const scope = { type: "workspace" as const, id: workspaceId };
  await Promise.all([
    ctx.authGate.assertWorkspaceMember(workspaceId),
    ctx.permissions.assert("workspace:read", scope),
  ]);

  return fetchWorkspaceById(workspaceId, db);
};
