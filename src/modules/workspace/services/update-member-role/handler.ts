import { AppError } from "@/shared/errors";
import type { UpdateMemberRoleInput } from "./types";
import type { ServiceContext } from "@/graphql/types";
import { updateRole } from "./steps/update-role";
import { guardSelf } from "./steps/guard-self";
import { guardHierarchy } from "./steps/guard-hierarchy";
import { addRoleMember, removeRoleMember } from "@/modules/authorization";

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

  const updated = await updateRole(memberId, workspaceId, roleId, db);

  // ── Cache Invalidation ───────────────────────────────────────────────────────
  // Role change must propagate instantly — clear all stale Redis entries for this user.
  const targetUserId = targetMember.userId;
  const oldRoleId = targetMember.assignedRole.id;

  await Promise.all([
    // 1. Clear all perm:* and granted-perms:* entries tracked in perm-index (emits WS push)
    ctx.permissions.invalidate.invalidateUserAll(targetUserId),
    // 2. Clear workspace membership cache, owner-bypass, and role-at-scope
    ctx.authGate.invalidate.workspaceMember(workspaceId, targetUserId),
    // 3. Maintain role-member index so future permission changes invalidate correctly
    removeRoleMember(oldRoleId, targetUserId, ctx.redis),
    addRoleMember(roleId, targetUserId, ctx.redis),
  ]);

  return updated;
};
