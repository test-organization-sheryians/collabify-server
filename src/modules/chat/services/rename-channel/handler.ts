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
  if (!ctx.authGate || !ctx.permissions) throw AppError.unauthorized();

  try {
    // Step 0 — channel member gate + permission
    const cachedChannel = await ctx.authGate.getChannel(input.channelId);
    if (!cachedChannel) throw AppError.notFound("Channel not found");
    const scope = { type: "workspace" as const, id: cachedChannel.workspaceId };
    await Promise.all([
      ctx.authGate.assertChannelMember(input.channelId),
      ctx.permissions.assert("chat:channel:update", scope),
    ]);

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
