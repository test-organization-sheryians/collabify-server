/**
 * updateMemberRole — Service Handler (thin orchestrator)
 *
 * Auth:
 *   - permissions.assert("workspace:member:role-update") — OWNER+ only (RBAC)
 * Steps:
 *   1. [auth] assert("workspace:member:role-update")
 *   2. fetchActorAndTarget — load both members with role ranks from DB
 *   3. guardSelf — actor !== target
 *   4. guardHierarchy — actor.rank > target.currentRank && actor.rank > newRole.rank
 *   5. guardLastOwner (only if target is currently OWNER and being demoted)
 *   6. updateRole — update by roleId; return updated member
 */
import { AppError } from "@/shared/errors";
import type { UpdateMemberRoleInput } from "./types";
import type { ServiceContext } from "@/graphql/types";
import { updateRole } from "./steps/update-role";
import { guardSelf } from "./steps/guard-self";
import { guardHierarchy } from "./steps/guard-hierarchy";

export const updateMemberRole = async (
  input: UpdateMemberRoleInput,
  ctx: ServiceContext
) => {
  const { workspaceId, memberId, roleId, actorUserId } = input;
  const { db } = ctx;

  if (!ctx.authGate || !ctx.permissions) throw AppError.unauthorized();
  const scope = { type: "workspace" as const, id: workspaceId };
  await ctx.permissions.assert("workspace:member:role-update", scope);

  // Fetch actor + target members with their role ranks
  const [actorMember, targetMember, newRole] = await Promise.all([
    db.workspaceMember.findFirst({
      where: { workspaceId, userId: actorUserId },
      include: { assignedRole: true },
    }),
    db.workspaceMember.findUnique({
      where: { id: memberId, workspaceId },
      include: { assignedRole: true },
    }),
    db.role.findFirst({
      where: { id: roleId, workspaceId, projectId: null },
    }),
  ]);

  if (!actorMember) throw AppError.forbidden("Actor is not a workspace member.");
  if (!targetMember) throw AppError.notFound("Target member not found.");
  if (!newRole) throw AppError.notFound("Role not found in workspace.");

  // Guard: cannot change own role
  await guardSelf(actorUserId, targetMember.userId);

  // Guard: rank hierarchy — actor must outrank both target and new role
  guardHierarchy(
    actorMember.assignedRole.rank,
    targetMember.assignedRole.rank,
    newRole.rank
  );

  // Guard: if demoting the last OWNER, block
  const targetIsCurrentlyOwner = targetMember.assignedRole.name === "OWNER";
  const newRoleIsOwner = newRole.name === "OWNER";
  if (targetIsCurrentlyOwner && !newRoleIsOwner) {
    const ownerCount = await db.workspaceMember.count({
      where: {
        workspaceId,
        assignedRole: { name: "OWNER" },
      },
    });
    if (ownerCount <= 1) {
      throw AppError.forbidden(
        "Cannot demote the last owner of this workspace."
      );
    }
  }

  return updateRole(memberId, workspaceId, roleId, db);
};
