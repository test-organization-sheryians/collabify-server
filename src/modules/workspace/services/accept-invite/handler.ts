/**
 * acceptInvite — Service Handler (thin orchestrator)
 *
 * ⚠️ All steps run inside a SINGLE db.$transaction to preserve atomicity.
 * Cache invalidation runs AFTER the transaction commits (non-fatal — Redis errors
 * must never roll back a successful DB membership creation).
 *
 * Steps (tx-scoped):
 *   1. fetchInvite             — find invite, guard expiry
 *   2. verifyInviteEmail       — assert email matches authenticated user
 *   3. checkExistingMembership — if already a member: delete invite, early return
 *   4. createMembership        — resolve role → create member + delete invite + fetch slug
 * Post-tx:
 *   5. invalidateWorkspaceMember — clear auth/membership/role-at-scope Redis keys
 *   6. addRoleMember             — add new member to role-member index
 */
import type { AcceptInviteInput } from "./types";
import type { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import { addRoleMember } from "@/modules/authorization";
import { emit } from "@/modules/notification/outbox/outbox-writer";

export const acceptInvite = async (
  input: AcceptInviteInput,
  ctx: ServiceContext
) => {
  const { token, userId, userEmail } = input;
  const { db } = ctx;

  const result = await db.$transaction(async (tx) => {
    // Step 1: fetch invite inside tx
    const invite = await tx.workspaceInvite.findUnique({ where: { token } });
    if (!invite || invite.expiresAt < new Date()) {
      throw AppError.notFound("INVITE_EXPIRED");
    }

    // Step 2: verify email inside tx
    if (invite.email !== userEmail) {
      throw AppError.forbidden("INVITE_EXPIRED");
    }

    // Step 3: already a member? clean up + early success
    const existing = await tx.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId: invite.workspaceId, userId },
      },
    });
    if (existing) {
      await tx.workspaceInvite.delete({ where: { token } });
      return {
        success: true,
        message: "You are already a member.",
        workspaceSlug: "unknown",
        workspaceId: invite.workspaceId,
        roleId: existing.roleId,
      };
    }

    // Step 4: create membership using roleId directly from the invite FK.
    // The FK guarantees the role exists — no separate lookup needed.
    await tx.workspaceMember.create({
      data: { workspaceId: invite.workspaceId, userId, roleId: invite.roleId },
    });
    await tx.workspaceInvite.delete({ where: { token } });
    const workspace = await tx.workspace.findUniqueOrThrow({
      where: { id: invite.workspaceId },
      select: { slug: true },
    });

    return {
      success: true,
      message: "Joined workspace successfully",
      workspaceSlug: workspace.slug,
      workspaceId: invite.workspaceId,
      roleId: invite.roleId,
    };
  });

  // Post-tx: cache invalidation — runs outside transaction so Redis errors don't roll back DB writes
  if (ctx.authGate) {
    await Promise.all([
      ctx.authGate.invalidate.workspaceMember(result.workspaceId, userId),
      addRoleMember(result.roleId, userId, ctx.redis),
    ]).catch((err) => {
      console.warn("acceptInvite: post-tx cache update failed (non-fatal):", err);
    });
  }

  // Emit notification only for new members (not for already-member case)
  if (result.message !== "You are already a member.") {
    await emit(db as any, {
      type: "workspace.invite.accepted",
      payload: {
        workspaceId: result.workspaceId,
        joinedUserId: userId,
        actorId: userId,
      },
      deduplicationId: `workspace.invite.accepted:${result.workspaceId}:${userId}`,
    }).catch(() => { /* non-fatal */ });
  }

  return {
    success: result.success,
    message: result.message,
    workspaceSlug: result.workspaceSlug,
  };
};

