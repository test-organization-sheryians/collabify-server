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

  return ctx.db.chatChannel.findMany({
    where: {
      workspaceId: input.workspaceId,
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
