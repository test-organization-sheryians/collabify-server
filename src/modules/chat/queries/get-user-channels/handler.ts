import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import { GetUserChannelsInput } from "./types";

export const handler = async (
  input: GetUserChannelsInput,
  ctx: ServiceContext
) => {
  const { userId } = ctx.auth;
  if (!userId)
    throw new AppError("User not authenticated", "UNAUTHORIZED", 401);

  const workspaceMember = await ctx.db.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId: input.workspaceId,
        userId,
      },
    },
  });

  if (!workspaceMember) {
    throw AppError.forbidden("You are not a member of this workspace");
  }

  // Verify user has access to the specific project
  const project = await ctx.db.project.findUnique({
    where: {
      id: input.projectId,
      workspaceId: input.workspaceId, // Ensure project belongs to workspace
    },
    select: {
      id: true,
      members: {
        where: { userId },
        select: { userId: true },
      },
    },
  });

  if (!project) {
    throw AppError.notFound("Project not found");
  }

  if (project.members.length === 0) {
    throw AppError.forbidden("You are not a member of this project");
  }

  return ctx.db.chatChannel.findMany({
    where: {
      workspaceId: input.workspaceId,
      projectId: input.projectId,
      deletedAt: null,
      members: {
        some: {
          userId,
        },
      },
    },
    take: input.limit,
    skip: input.offset,
    orderBy: {
      createdAt: "desc",
    },
  });
};
