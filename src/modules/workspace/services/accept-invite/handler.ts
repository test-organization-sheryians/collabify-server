/**
 * acceptInvite — Service Handler (thin orchestrator)
 *
 * ⚠️ All steps run inside a SINGLE db.$transaction to preserve atomicity.
 *
 * Steps (tx-scoped):
 *   1. fetchInvite             — find invite, guard expiry
 *   2. verifyInviteEmail       — assert email matches authenticated user
 *   3. checkExistingMembership — if already a member: delete invite, early return
 *   4. createMembership        — resolve role → create member + delete invite + fetch slug
 */
import type { AcceptInviteInput } from "./types";
import type { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";

export const acceptInvite = async (
  input: AcceptInviteInput,
  ctx: ServiceContext
) => {
  const { token, userId, userEmail } = input;
  const { db } = ctx;

  return db.$transaction(async (tx) => {
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
      };
    }

    // Step 4: resolve the Role row for this workspace by invite.role name
    const role = await tx.role.findUnique({
      where: {
        workspaceId_name: {
          workspaceId: invite.workspaceId,
          name: invite.role, // invite.role is RoleType enum value e.g. "MEMBER"
        },
      },
    });
    if (!role) {
      throw new AppError(
        `Role "${invite.role}" not found in workspace ${invite.workspaceId}`,
        "INTERNAL_SERVER_ERROR",
        500
      );
    }

    // Step 4 cont: create membership + delete invite + get slug
    await tx.workspaceMember.create({
      data: { workspaceId: invite.workspaceId, userId, roleId: role.id },
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
    };
  });
};
