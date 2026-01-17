import { AppError } from "@/shared/errors";
import { RoleType } from "@prisma/client";
import { RemoveMemberInput } from "./types";
import { ServiceContext } from "@/graphql/types";

export const removeMember = async (
  input: RemoveMemberInput,
  ctx: ServiceContext
) => {
  const { workspaceId, memberId, actorUserId } = input;
  const { db } = ctx;

  const actorMember = await db.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId: actorUserId,
      },
    },
  });

  const targetMember = await db.workspaceMember.findUnique({
    where: { id: memberId, workspaceId },
  });

  if (!targetMember) {
    throw AppError.notFound("Member not found");
  }

  const isSelf = targetMember.userId === actorUserId;
  const isOwner = actorMember?.role === RoleType.OWNER;

  if (!isSelf && !isOwner) {
    throw AppError.forbidden("Insufficient permissions");
  }

  if (targetMember.role === RoleType.OWNER) {
    const ownerCount = await db.workspaceMember.count({
      where: { workspaceId, role: RoleType.OWNER },
    });
    if (ownerCount <= 1) {
      throw AppError.badRequest("Cannot remove the last owner");
    }
  }

  await db.workspaceMember.delete({
    where: {
      id: memberId,
    },
  });

  return { success: true, message: "Member removed", invitedCount: 0 };
};
