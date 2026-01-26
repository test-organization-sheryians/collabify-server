import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import { Prisma } from "@prisma/client";
import { RenameChannelInput } from "./types";

export const handler = async (
  input: RenameChannelInput,
  ctx: ServiceContext
) => {
  const { userId } = ctx.auth;
  if (!userId)
    throw new AppError("User not authenticated", "UNAUTHORIZED", 401);

  try {
    // 1. Fetch Channel to get Workspace context
    const channel = await ctx.db.chatConversation.findUnique({
      where: { id: input.channelId },
      select: { id: true, workspaceId: true },
    });

    if (!channel) throw AppError.notFound("Channel not found");

    // 2. Authorization: Check Workspace Membership
    // (Renaming usually requires being a member, possibly admin/owner in future,
    // but for now any workspace member can rename public channels as per implicit requirements)
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

    // 3. Update Name
    return await ctx.db.chatConversation.update({
      where: { id: input.channelId },
      data: { name: input.name },
    });
  } catch (error: any) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        throw AppError.conflict("Channel name already taken in this project");
      }
    }
    if (error instanceof AppError) throw error;
    throw new AppError("Failed to rename channel");
  }
};
