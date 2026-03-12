import { WSHandlerContext } from "@/infra/ws/types";
import { ChatWebSocket } from "@/infra/ws/types";
import type { TypingStartInput } from "./schema";
import { setTyping } from "@/modules/chat/domain/typing/redis-ops";
import { createLogger } from "@/shared/lib/logger";

const logger = createLogger("chat:ws:typing-start");
import { appRedis } from "@/infra/redis";

export const typingStartHandler = async (
  ctx: WSHandlerContext,
  socket: ChatWebSocket,
  input: TypingStartInput
) => {
  const { conversationId, nonce } = input;
  const { userId } = socket.data;

  try {
    // 1. Verify membership (cache-backed)
    if (!ctx.authGate) { return; }
    await ctx.authGate.assertChannelMember(conversationId);

    // 2. Set typing state in Redis (auto-expires in 5s)
    await setTyping(conversationId, userId);

    // 3. Fanout to other conversation members
    const event = {
      type: "chat:typing-start",
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

    logger.debug("Typing-start processed", {
      conversationId,
      userId,
      memberCount: onlineMembers.length,
    });
  } catch (error) {
    logger.error("Typing-start handler error", {
      error,
      conversationId,
      userId,
    });
  }
};
