/**
 * removeMember — Service Handler (thin orchestrator)
 *
 * Auth:
 *   - permissions.assert("workspace:member:remove") — ADMIN+ only (RBAC)
 * Steps:
 *   1. [auth] assert("workspace:member:remove") — RBAC check
 *   2. fetchMembers    — load actor + target member records
 *   3. guardLastOwner  — if target is OWNER, assert not the last one
 *   4. deleteMember    — delete workspaceMember record
 */
import { AppError } from "@/shared/errors";
import type { RemoveMemberInput } from "./types";
import type { ServiceContext } from "@/graphql/types";
import { guardLastOwner } from "./steps/guard-last-owner";
import { deleteMember } from "./steps/delete-member";
import { fetchMembers } from "./steps/fetch-members";
import { emit } from "@/modules/notification/outbox/outbox-writer";

export const removeMember = async (
  input: RemoveMemberInput,
  ctx: ServiceContext
) => {
  const { workspaceId, memberId, actorUserId } = input;
  const { db } = ctx;

  if (!ctx.authGate || !ctx.permissions) throw AppError.unauthorized();
  const scope = { type: "workspace" as const, id: workspaceId };
  const [, { targetMember }] = await Promise.all([
    ctx.permissions.assert("workspace:member:remove", scope),
    fetchMembers(workspaceId, memberId, actorUserId, db),
  ]);

  await guardLastOwner(workspaceId, targetMember, db);
  await deleteMember(memberId, workspaceId, targetMember.userId, db);

  // Fetch names needed for notification payload (non-blocking)
  const [workspace, actor] = await Promise.all([
    db.workspace.findUnique({ where: { id: workspaceId }, select: { name: true, slug: true } }),
    db.user.findUnique({ where: { id: actorUserId }, select: { fullName: true } }),
  ]);

  // Notify the removed member
  await db.$transaction((tx) => emit(tx, {
    type: "workspace.member.removed",
    payload: {
      workspaceId,
      workspaceName:  workspace?.name ?? "",
      workspaceSlug:  workspace?.slug ?? "",
      removedUserId:  targetMember.userId,
      actorId:        actorUserId,
      actorName:      actor?.fullName ?? "A workspace admin",
    },
  })).catch(() => { /* non-fatal */ });

  return { success: true, message: "Member removed", invitedCount: 0 };
};
