import { WSHandlerContext } from "@/infra/ws/types";
import { ChatWebSocket } from "@/infra/ws/types";
import type { MarkReadInput } from "./schema";
import { updateReadWatermark } from "@/modules/chat/domain/read-receipts/redis-ops";
import { readReceiptQueue } from "@/modules/chat/jobs/queues";
import { createLogger } from "@/shared/lib/logger";

const logger = createLogger("chat:ws:mark-read");

export const markReadHandler = async (
  ctx: WSHandlerContext,
  socket: ChatWebSocket,
  input: MarkReadInput
) => {
  const { conversationId, watermarkId } = input;
  const { userId } = socket.data;

  try {
    // 1. Verify membership
    const member = await ctx.db.chatMember.findFirst({
      where: { conversationId, userId },
    });

    if (!member) {
      logger.warn("Member not found", { userId, conversationId });
      return;
    }

    // 2. Get message sequence
    const message = await ctx.db.chatMessage.findUnique({
      where: { id: watermarkId },
      select: {
        id: true,
        sequence: true,
        conversationId: true,
        authorUserId: true,
      },
    });

    if (!message || message.conversationId !== conversationId) {
      logger.warn("Message not found", { watermarkId, conversationId });
      return;
    }

    // 3. Update Redis watermark (immediate)
    await updateReadWatermark(
      conversationId,
      userId,
      watermarkId,
      message.sequence
    );

    // 4. Determine fanout strategy
    const conversation = await ctx.db.chatConversation.findUnique({
      where: { id: conversationId },
      select: { type: true },
    });

    if (conversation?.type === "DM") {
      // DM: Fanout to other user
      const otherMember = await ctx.db.chatMember.findFirst({
        where: {
          conversationId,
          userId: { not: userId },
        },
        select: { userId: true },
      });

      if (otherMember) {
        await publishReadReceipt(
          ctx,
          conversationId,
          userId,
          watermarkId,
          message.sequence,
          [otherMember.userId]
        );
      }
    } else if (conversation?.type === "GROUP_DM") {
      // Group: Only fanout to message author
      if (message.authorUserId !== userId) {
        await publishReadReceipt(
          ctx,
          conversationId,
          userId,
          watermarkId,
          message.sequence,
          [message.authorUserId]
        );
      }
    }
    // Channel/Thread: No fanout (too expensive)

    // 5. Queue DB update (batched)
    await readReceiptQueue.add(
      "batch-update",
      {
        conversationId,
        userId,
        watermarkId,
        sequence: message.sequence,
      },
      {
        delay: 5000, // 5s batch window
        jobId: `${conversationId}:${userId}`, // Deduplicate
      }
    );

    // 6. Send ACK
    socket.send(
      JSON.stringify({
        type: "ack",
        nonce: input.nonce,
        success: true,
      })
    );
  } catch (error) {
    logger.error("mark-read error", {
      error,
      conversationId,
      userId,
    });
  }
};

// Helper: Publish read receipt to specific users
async function publishReadReceipt(
  ctx: WSHandlerContext,
  conversationId: string,
  readerId: string,
  watermarkId: string,
  sequence: number,
  targetUserIds: string[]
): Promise<void> {
  const event = {
    type: "chat:message-read",
    data: {
      conversationId,
      userId: readerId,
      watermarkId,
      watermarkSequence: sequence,
      timestamp: Date.now(),
    },
  };

  // Publish to each target user's Pub/Sub channel
  for (const targetUserId of targetUserIds) {
    const topic = `user:${targetUserId}:events`;
    await ctx.redis.publish(topic, JSON.stringify(event));
  }
}
