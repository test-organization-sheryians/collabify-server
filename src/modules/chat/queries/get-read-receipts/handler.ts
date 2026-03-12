import type { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import type { GetReadReceiptsInput, ReadReceiptsOutput } from "./schema";
import {
  getUsersWhoRead,
  getMessageReadCount,
} from "@/modules/chat/domain/read-receipts/redis-ops";

export const handler = async (
  input: GetReadReceiptsInput,
  ctx: ServiceContext
): Promise<ReadReceiptsOutput> => {
  const { messageId } = input;
  if (!ctx.authGate || !ctx.permissions) throw AppError.unauthorized();

  // 1. Get message + conversation
  const message = await ctx.db.chatMessage.findUnique({
    where: { id: messageId },
    select: {
      conversationId: true,
      sequence: true,
    },
  });

  if (!message) {
    throw AppError.notFound("Message not found");
  }

  const cachedChannel = await ctx.authGate.getChannel(message.conversationId);
  if (!cachedChannel) throw AppError.notFound("Channel not found");
  const scope = { type: "workspace" as const, id: cachedChannel.workspaceId };
  await Promise.all([
    ctx.authGate.assertChannelMember(message.conversationId),
    ctx.permissions.assert("conversation:read", scope),
  ]);

  // 2. Try Redis first (fast path)
  const readCount = await getMessageReadCount(messageId);
  const readerIds = await getUsersWhoRead(
    message.conversationId,
    message.sequence
  );

  if (readerIds.length > 0) {
    // Fetch user details
    const users = await ctx.db.user.findMany({
      where: { id: { in: readerIds } },
      select: {
        id: true,
        fullName: true,
        avatarUrl: true,
      },
    });

    // Get total members
    const totalMembers = await ctx.db.chatMember.count({
      where: { conversationId: message.conversationId },
    });

    return {
      readBy: users.map((u) => ({
        userId: u.id,
        username: u.fullName || "Unknown",
        avatarUrl: u.avatarUrl,
      })),
      totalReads: readCount || readerIds.length,
      totalMembers,
    };
  }

  // 3. Fallback: DB watermarks (for older messages)
  const readers = await ctx.db.chatMember.findMany({
    where: {
      conversationId: message.conversationId,
      lastReadSeq: { gte: message.sequence },
    },
    select: {
      user: {
        select: {
          id: true,
          fullName: true,
          avatarUrl: true,
        },
      },
    },
  });

  const totalMembers = await ctx.db.chatMember.count({
    where: { conversationId: message.conversationId },
  });

  return {
    readBy: readers.map((r) => ({
      userId: r.user.id,
      username: r.user.fullName || "Unknown",
      avatarUrl: r.user.avatarUrl,
    })),
    totalReads: readers.length,
    totalMembers,
  };
};
