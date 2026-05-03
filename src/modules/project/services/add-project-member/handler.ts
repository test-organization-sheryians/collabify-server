/**
 * addProjectMember — Service Handler (thin orchestrator)
 *
 * Auth:
 *   - permissions.assert("project:member:add") — MANAGER+ only (RBAC)
 * Steps:
 *   1. [auth] assert("project:member:add")
 *   2. verifyTargetIsWorkspaceMember  — BAD_REQUEST if target not in workspace
 *   3. enforceWorkspaceGuestCeiling   — silently substitutes GUEST role if workspace rank <= 10
 *   4. createProjectMember            — create row with effective role; CONFLICT if already member
 */
import { AppError } from "@/shared/errors";
import type { AddProjectMemberInput } from "./schema";
import type { ServiceContext } from "@/graphql/types";
import { verifyTargetIsWorkspaceMember } from "./steps/verify-target-is-workspace-member";
import { enforceWorkspaceGuestCeiling } from "./steps/enforce-workspace-guest-ceiling";
import { createProjectMember } from "./steps/create-project-member";
import { emit } from "@/modules/notification/outbox/outbox-writer";

export const addProjectMember = async (
  input: AddProjectMemberInput,
  ctx: ServiceContext
) => {
  const { projectId, workspaceId, actorUserId, targetUserId, roleId } = input;
  const { db } = ctx;

  if (!ctx.authGate || !ctx.permissions) throw AppError.unauthorized();

  const scope = { type: "project" as const, id: projectId, workspaceId };
  await ctx.permissions.assert("project:member:add", scope);

  await verifyTargetIsWorkspaceMember(workspaceId, targetUserId, db);

  const effectiveRoleId = await enforceWorkspaceGuestCeiling(
    workspaceId,
    targetUserId,
    roleId,
    db,
    { mode: "add" }
  );

  const member = await createProjectMember(projectId, workspaceId, targetUserId, db, effectiveRoleId);

  await Promise.all([
    ctx.permissions.invalidate.invalidateUser(targetUserId, projectId),
    ctx.authGate.invalidate.projectMember(projectId, targetUserId),
  ]);

  const [project, workspace, actor, role] = await Promise.all([
    db.project.findUnique({ where: { id: projectId }, select: { name: true } }),
    db.workspace.findUnique({ where: { id: workspaceId }, select: { slug: true } }),
    db.user.findUnique({ where: { id: actorUserId }, select: { fullName: true } }),
    db.role.findUnique({ where: { id: effectiveRoleId ?? undefined }, select: { name: true } }),
  ]);

  await emit(db as any, {
    type: "project.member.added",
    payload: {
      projectId,
      workspaceId,
      workspaceSlug: workspace?.slug ?? "",
      newMemberId: targetUserId,
      actorId: actorUserId,
      actorName: actor?.fullName ?? "Someone",
      projectName: project?.name ?? "",
      roleName: role?.name ?? "Member",
    } as any,
    deduplicationId: `project.member.added:${projectId}:${targetUserId}:${Date.now()}`,
  }).catch(() => { /* non-fatal */ });

  return member;
};
