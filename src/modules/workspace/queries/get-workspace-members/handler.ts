import { AppError } from "@/shared/errors";
import { GetWorkspaceMembersInput } from "./types";
import { ServiceContext } from "@/graphql/types";

export const getWorkspaceMembers = async (
  input: GetWorkspaceMembersInput,
  ctx: ServiceContext
) => {
  const { workspaceId, actorUserId } = input;
  const { db } = ctx;

  const membership = await db.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId: actorUserId,
      },
    },
  });

  if (!membership) {
    throw AppError.forbidden("You are not a member of this workspace");
  }

  const members = await db.workspaceMember.findMany({
    where: {
      workspaceId: workspaceId,
    },
    include: {
      user: true,
    },
    orderBy: {
      joinedAt: "desc",
    },
  });

  return members;
};
