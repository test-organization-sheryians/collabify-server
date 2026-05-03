/**
 * updateProjectMemberRole — Service Handler (thin orchestrator)
 *
 * Auth:
 *   - permissions.assert("project:member:role-update") — MANAGER+ only (RBAC)
 * Steps:
 *   1. [auth] assert("project:member:role-update")
 *   2. enforceWorkspaceGuestCeiling — FORBIDDEN if target is a workspace GUEST and new role rank > 10
 *   3. setProjectMemberRole — update roleId; NOT_FOUND if member or role missing
 */
import { AppError } from "@/shared/errors";
import type { UpdateProjectMemberRoleInput } from "./schema";
import type { ServiceContext } from "@/graphql/types";
import { enforceWorkspaceGuestCeiling } from "../add-project-member/steps/enforce-workspace-guest-ceiling";
import { setProjectMemberRole } from "./steps/set-project-member-role";
import { keys } from "@/modules/authorization/cache/keys";
import { emit } from "@/modules/notification/outbox/outbox-writer";

export const updateProjectMemberRole = async (
  input: UpdateProjectMemberRoleInput,
  ctx: ServiceContext
) => {
  const { projectId, workspaceId, actorUserId, targetUserId, roleId } = input;
  const { db } = ctx;

  if (!ctx.authGate || !ctx.permissions) throw AppError.unauthorized();

  const scope = { type: "project" as const, id: projectId, workspaceId };
  await ctx.permissions.assert("project:member:role-update", scope);

  // Workspace GUEST ceiling: cannot elevate a GUEST to CONTRIBUTOR or MANAGER
  await enforceWorkspaceGuestCeiling(workspaceId, targetUserId, roleId, db, {
    mode: "update",
  });

  // Fetch current roleId before update for role-member index maintenance
  const currentMember = await db.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: targetUserId } },
    select: { projectRoleId: true },
  });
  const oldRoleId = currentMember?.projectRoleId ?? null;

  const member = await setProjectMemberRole(projectId, targetUserId, roleId, db);

  // Build role-member index ops — srem old role if present, always sadd new role
  const indexOps: Promise<unknown>[] = [
    ctx.redis.sadd(keys.roleMembersIndex(roleId), targetUserId),
  ];
  if (oldRoleId) {
    indexOps.push(ctx.redis.srem(keys.roleMembersIndex(oldRoleId), targetUserId));
  }

  await Promise.all([
    ctx.permissions.invalidate.invalidateUser(targetUserId, projectId),
    ctx.authGate.invalidate.projectMember(projectId, targetUserId),
    ...indexOps,
  ]);

  const [project, workspace, actor, newRoleObj, oldRoleObj] = await Promise.all([
    db.project.findUnique({ where: { id: projectId }, select: { name: true } }),
    db.workspace.findUnique({ where: { id: workspaceId }, select: { slug: true } }),
    db.user.findUnique({ where: { id: actorUserId }, select: { fullName: true } }),
    db.role.findUnique({ where: { id: roleId }, select: { name: true } }),
    oldRoleId ? db.role.findUnique({ where: { id: oldRoleId }, select: { name: true } }) : Promise.resolve(null),
  ]);

  await emit(db as any, {
    type: "project.member.role_changed",
    payload: {
      projectId,
      workspaceId,
      workspaceSlug: workspace?.slug ?? "",
      memberId: targetUserId,
      actorId: actorUserId,
      actorName: actor?.fullName ?? "Someone",
      projectName: project?.name ?? "",
      oldRoleName: oldRoleObj?.name ?? "",
      newRoleName: newRoleObj?.name ?? "",
    },
  }).catch(() => { /* non-fatal */ });

  return member;
};
