/**
 * getWorkspaceInvites — Query Handler (thin orchestrator)
 *
 * Auth:
 *   - assertWorkspaceAdminOrAbove — FORBIDDEN if rank < ADMIN
 *   - permissions.assert("workspace.member:invite") — RBAC check
 * Steps:
 *   1. [auth] assertWorkspaceAdminOrAbove + assert("workspace.member:invite") — parallel
 *   2. fetchPendingInvites — load all non-expired invites
 */
import { AppError } from "@/shared/errors";
import type { GetWorkspaceInvitesInput } from "./schema";
import type { ServiceContext } from "@/graphql/types";
import { fetchPendingInvites } from "./steps/fetch-pending-invites";

export const getWorkspaceInvites = async (
  input: GetWorkspaceInvitesInput,
  ctx: ServiceContext
) => {
  const { workspaceId, actorUserId } = input;
  const { db } = ctx;

  if (!ctx.authGate || !ctx.permissions) throw AppError.unauthorized();
  const scope = { type: "workspace" as const, id: workspaceId };
  await Promise.all([
    ctx.authGate.assertWorkspaceAdminOrAbove(workspaceId),
    ctx.permissions.assert("workspace.member:invite", scope),
  ]);

  return fetchPendingInvites(workspaceId, db);
};
