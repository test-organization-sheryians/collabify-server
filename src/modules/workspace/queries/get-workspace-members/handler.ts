/**
 * getWorkspaceMembers — Query Handler (thin orchestrator)
 *
 * Auth:
 *   - assertWorkspaceMember — cache-backed; FORBIDDEN if not a member
 *   - permissions.assert("workspace:member:read") — RBAC check
 * Steps:
 *   1. [auth] assertWorkspaceMember + assert("workspace:member:read") — parallel
 *   2. fetchMembers — load all members with user profiles, ordered by joinedAt
 */
import { AppError } from "@/shared/errors";
import type { GetWorkspaceMembersInput } from "./types";
import type { ServiceContext } from "@/graphql/types";
import { fetchMembers } from "./steps/fetch-members";

export const getWorkspaceMembers = async (
  input: GetWorkspaceMembersInput,
  ctx: ServiceContext
) => {
  const { workspaceId, actorUserId } = input;
  const { db } = ctx;

  if (!ctx.authGate || !ctx.permissions) throw AppError.unauthorized();
  const scope = { type: "workspace" as const, id: workspaceId };
  await Promise.all([
    ctx.authGate.assertWorkspaceMember(workspaceId),
    ctx.permissions.assert("workspace:member:read", scope),
  ]);

  const members = await fetchMembers(workspaceId, db);

  return members.map((m) => ({
    ...m,
    role: m.assignedRole.name,
  }));
};
