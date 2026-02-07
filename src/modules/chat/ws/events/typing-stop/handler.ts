import { WSHandlerContext } from "@/infra/ws/types";
import { ChatWebSocket } from "@/infra/ws/types";
import type { TypingStopInput } from "./schema";
import { clearTyping } from "@/modules/chat/domain/typing/redis-ops";
import { logger } from "@/shared/logger";
import { appRedis } from "@/infra/redis";

export const typingStopHandler = async (
  ctx: WSHandlerContext,
  socket: ChatWebSocket,
  input: TypingStopInput
) => {
  const { conversationId, nonce } = input;
  const { userId } = socket.data;

  try {
    // 1. Verify membership (optional - could skip for performance)
    const member = await ctx.db.chatMember.findFirst({
      where: { conversationId, userId },
    });

    if (!member) {
      logger.warn({ userId, conversationId }, "Typing-stop: Member not found");
      return;
    }

    // 2. Clear typing state in Redis
    await clearTyping(conversationId, userId);

    // 3. Fanout to other conversation members
    const event = {
      type: "chat:typing-stop",
      data: {
        conversationId,
        userId,
        timestamp: Date.now(),
      },
    };

    // Get all online members
    const onlineMembers = await ctx.db.chatMember.findMany({
      where: {
        conversationId,
        userId: { not: userId },
      },
      select: { userId: true },
    });

    // Publish to each member's personal event channel
    for (const member of onlineMembers) {
      const topic = `user:${member.userId}:events`;
      await appRedis.publish(topic, JSON.stringify(event));
    }

    // 4. Send ACK to client
    if (nonce) {
      socket.send(
        JSON.stringify({
          type: "ack",
          nonce,
          success: true,
        })
      );
    }

    logger.debug(
      { conversationId, userId, memberCount: onlineMembers.length },
      "Typing-stop processed"
    );
  } catch (error) {
    logger.error(
      { error, conversationId, userId },
      "Typing-stop handler error"
    );
  }
};
