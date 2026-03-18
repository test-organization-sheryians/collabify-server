/**
 * removeMember — Service Handler (thin orchestrator)
 *
 * Auth:
 *   - assertWorkspaceAdminOrAbove — FORBIDDEN if actor rank < ADMIN
 *   - permissions.assert("workspace.member:remove") — RBAC check
 * Steps:
 *   1. [auth] assertWorkspaceAdminOrAbove + assert("workspace.member:remove") — parallel
 *   2. guardLastOwner  — if target is OWNER, assert not the last one
 *   3. deleteMember    — delete workspaceMember record
 */
import { AppError } from "@/shared/errors";
import type { RemoveMemberInput } from "./types";
import type { ServiceContext } from "@/graphql/types";
import { guardLastOwner } from "./steps/guard-last-owner";
import { deleteMember } from "./steps/delete-member";
import { fetchMembers } from "./steps/fetch-members";

export const removeMember = async (
  input: RemoveMemberInput,
  ctx: ServiceContext
) => {
  const { workspaceId, memberId, actorUserId } = input;
  const { db } = ctx;

  if (!ctx.authGate || !ctx.permissions) throw AppError.unauthorized();
  const scope = { type: "workspace" as const, id: workspaceId };
  const [, { targetMember }] = await Promise.all([
    Promise.all([
      ctx.authGate.assertWorkspaceAdminOrAbove(workspaceId),
      ctx.permissions.assert("workspace.member:remove", scope),
    ]),
    fetchMembers(workspaceId, memberId, actorUserId, db),
  ]);

  await guardLastOwner(workspaceId, targetMember, db);
  await deleteMember(memberId, workspaceId, targetMember.userId, db);

  return { success: true, message: "Member removed", invitedCount: 0 };
};
