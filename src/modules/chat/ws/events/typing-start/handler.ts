import { WSHandlerContext } from "@/infra/ws/core/types";
import { ChatDownstreamEvent } from "@/shared/contracts/chat/events";
import { GenericWebSocket } from "@/infra/ws/core/types";
import type { TypingStartInput } from "./schema";
import { setTyping } from "@/modules/chat/domain/typing/redis-ops";
import { logger } from "@/shared/logger";
import { appRedis } from "@/infra/redis";

export const typingStartHandler = async (
  ctx: WSHandlerContext,
  socket: GenericWebSocket,
  input: TypingStartInput
) => {
  const { conversationId, nonce } = input;
  const { userId } = socket.data;

  try {
    // 1. Verify membership
    const member = await ctx.db.chatMember.findFirst({
      where: { conversationId, userId },
    });

    if (!member) {
      logger.warn({ userId, conversationId }, "Typing-start: Member not found");
      return;
    }

    // 2. Set typing state in Redis (auto-expires in 5s)
    await setTyping(conversationId, userId);

    // 3. Fanout to other conversation members
    const event = {
      type: ChatDownstreamEvent.UserTyping,
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
        userId: { not: userId }, // Exclude self
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
      "Typing-start processed"
    );
  } catch (error) {
    logger.error(
      { error, conversationId, userId },
      "Typing-start handler error"
    );
  }
};
