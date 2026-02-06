import { AppError } from "@/shared/errors";
import { AcceptInviteInput } from "./types";
import { ServiceContext } from "@/graphql/types";

export const acceptInvite = async (
  input: AcceptInviteInput,
  ctx: ServiceContext
) => {
  const { token, userId, userEmail } = input;
  const { db } = ctx;

  return db.$transaction(async (tx) => {
    const invite = await tx.workspaceInvite.findUnique({
      where: { token },
    });

    if (!invite || invite.expiresAt < new Date()) {
      throw AppError.notFound("INVITE_EXPIRED");
    }

    if (invite.email !== userEmail) {
      throw AppError.forbidden("INVITE_EXPIRED");
    }

    const existing = await tx.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: invite.workspaceId,
          userId,
        },
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

    await tx.workspaceMember.create({
      data: {
        workspaceId: invite.workspaceId,
        userId,
        role: invite.role,
      },
    });

    await tx.workspaceInvite.delete({
      where: { token },
    });

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
