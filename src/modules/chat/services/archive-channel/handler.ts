import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import { ArchiveChannelInput } from "./types";

export const handler = async (
  input: ArchiveChannelInput,
  ctx: ServiceContext
) => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated");
  if (!ctx.authGate || !ctx.permissions) throw AppError.unauthorized();

  try {
    // Step 0 — channel member gate + permission
    const cachedChannel = await ctx.authGate.getChannel(input.channelId);
    if (!cachedChannel) throw AppError.notFound("Channel not found");
    const scope = { type: "workspace" as const, id: cachedChannel.workspaceId };
    await Promise.all([
      ctx.authGate.assertChannelMember(input.channelId),
      ctx.permissions.assert("chat:channel:archive", scope),
    ]);

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
