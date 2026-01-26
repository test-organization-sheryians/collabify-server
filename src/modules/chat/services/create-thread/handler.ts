import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import { ulid } from "ulid";
import { CreateThreadInput } from "./types";

export const handler = async (
  input: CreateThreadInput,
  ctx: ServiceContext
) => {
  const { userId } = ctx.auth;
  if (!userId)
    throw new AppError("User not authenticated", "UNAUTHORIZED", 401);

  // 1. Validate Parent Message Integrity
  const parentMessage = await ctx.db.chatMessage.findUnique({
    where: { id: input.parentMessageId },
    select: { id: true, conversationId: true, parentMessageId: true },
  });

  if (!parentMessage) {
    throw AppError.notFound("Parent message not found");
  }

  if (parentMessage.conversationId !== input.channelId) {
    throw AppError.badRequest("Parent message belongs to a different channel");
  }

  if (parentMessage.parentMessageId) {
    throw AppError.badRequest("Nested threads are not supported");
  }

  // 2. Authorization: Check Channel Membership
  const membership = await ctx.db.chatMember.findUnique({
    where: {
      conversationId_userId: {
        conversationId: input.channelId,
        userId,
      },
    },
  });

  if (!membership) {
    throw AppError.forbidden("You are not a member of this channel");
  }

  // 3. Create Reply & Increment Count Atomically
  const replyId = ulid();

  // Use a transaction to ensure count and reply are in sync
  const [reply] = await ctx.db.$transaction([
    ctx.db.chatMessage.create({
      data: {
        id: replyId,
        conversationId: input.channelId,
        authorUserId: userId,
        parentMessageId: input.parentMessageId,
        streamId: replyId, // Using own ID as stream ID for simple ordering or fallback
        content: input.content as any,
        type: "TEXT", // Default type
      },
    }),
    ctx.db.chatMessage.update({
      where: { id: input.parentMessageId },
      data: {
        replyCount: { increment: 1 },
      },
    }),
  ]);

  return reply;
};
