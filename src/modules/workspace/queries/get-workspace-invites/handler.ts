/**
 * getWorkspaceInvites — Query Handler (thin orchestrator)
 *
 * Auth:
 *   - permissions.assert("workspace:invite:view") — ADMIN+ only (RBAC)
 * Steps:
 *   1. [auth] assert("workspace:invite:view")
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
  await ctx.permissions.assert("workspace:invite:view", scope);

  return fetchPendingInvites(workspaceId, db);
};
