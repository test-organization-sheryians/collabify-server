import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import { ArchiveChannelInput } from "./types";

export const handler = async (
  input: ArchiveChannelInput,
  ctx: ServiceContext
) => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated");

  try {
    // 1. Fetch Channel to get Workspace context
    const channel = await ctx.db.chatConversation.findUnique({
      where: { id: input.channelId },
      select: { id: true, workspaceId: true },
    });

    if (!channel) throw AppError.notFound("Channel not found");

    // 2. Authorization: Check Workspace Membership
    const membership = await ctx.db.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: channel.workspaceId,
          userId,
        },
      },
    });

    if (!membership) {
      throw AppError.forbidden("You are not a member of this workspace");
    }

    // 3. Action: Archive (sets both isArchived and deletedAt for soft delete)
    return await ctx.db.chatConversation.update({
      where: { id: input.channelId },
      data: {
        isArchived: true,
        deletedAt: new Date(), // Set soft delete timestamp
      },
    });
  } catch (error: any) {
    if (error instanceof AppError) throw error;
    // Fallback for Prisma/System errors
    throw new AppError("Failed to archive channel");
  }
};
