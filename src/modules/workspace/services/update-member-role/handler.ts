import { AppError } from "@/shared/errors";
import { RoleType } from "@prisma/client";
import { UpdateMemberRoleInput } from "./types";
import { ServiceContext } from "@/graphql/types";

export const updateMemberRole = async (
  input: UpdateMemberRoleInput,
  ctx: ServiceContext
) => {
  const { workspaceId, memberId, role, actorUserId } = input;
  const { db } = ctx;

  const actorMember = await db.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId: actorUserId,
      },
    },
  });

  if (!actorMember || actorMember.role !== RoleType.OWNER) {
    throw AppError.forbidden("Only owners can update roles");
  }

  const updatedMember = await db.workspaceMember.update({
    where: {
      id: memberId,
      workspaceId: workspaceId,
    },
    data: {
      role,
    },
    include: {
      user: true,
    },
  });

  return updatedMember;
};
