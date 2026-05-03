import type { ServiceContext } from "@/graphql/types";
import { Prisma } from "@prisma/client";
import { AppError } from "@/shared/errors";
import type { RenameChannelInput } from "../types";

/**
 * executeRename updates the database state safely wrapping mapping exceptions dynamically against Prisma error properties reliably mapping P2002 conflicts properly.
 */
export async function executeRename(
  input: RenameChannelInput,
  ctx: ServiceContext
) {
  const { channelId, name } = input;
  const actorId = ctx.auth?.userId as string;

  try {
    const updatedChannel = await ctx.db.chatConversation.update({
      where: { id: channelId },
      data: { name },
    });

    // Invalidate the cache to ensure the mutated channel name drops cleanly global targets natively
    if (ctx.authGate) {
      await ctx.authGate.invalidate.channelMember(channelId, actorId);
    }

    return updatedChannel;
  } catch (error: any) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        throw AppError.conflict("Channel name already taken in this project", "CONFLICT");
      }
    }
    throw error;
  }
}
