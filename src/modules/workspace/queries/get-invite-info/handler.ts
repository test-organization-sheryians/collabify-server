import { AppError } from "@/shared/errors";
import { GetInviteInfoInput } from "./types";
import { ServiceContext } from "@/graphql/types";

export const getInviteInfo = async (
  input: GetInviteInfoInput,
  ctx: ServiceContext
) => {
  const { token, userId, userEmail } = input;
  const { db } = ctx;

  const invite = await db.workspaceInvite.findUnique({
    where: { token },
    include: {
      workspace: {
        select: { name: true, logoUrl: true },
      },
    },
  });

  if (!invite || invite.expiresAt < new Date()) {
    throw AppError.notFound("INVITE_EXPIRED");
  }

  if (userEmail && invite.email !== userEmail) {
    throw AppError.forbidden("INVITE_EXPIRED");
  }

  if (userId) {
    const member = await db.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: invite.workspaceId,
          userId,
        },
      },
    });

    if (member) {
      throw AppError.conflict("ALREADY_MEMBER");
    }
  }

  return {
    workspaceName: invite.workspace.name,
    workspaceLogoUrl: invite.workspace.logoUrl,
    inviterName: "Workspace Admin",
  };
};
