import { Context } from "hono";
import { ChatWebSocket, createSuccessFrame } from "@/infra/ws/types";
import { wsRegistry } from "@/infra/ws/subscription-registry";
import { UnsubscribeChannelInput } from "./schema";
import { logger } from "@/shared/logger";
import { KeyFactory } from "@/infra/redis/keys";

export const unsubscribeChannelHandler = async (
  ctx: Context,
  socket: ChatWebSocket,
  input: UnsubscribeChannelInput
) => {
  const { conversationId } = input;
  const { userId, socketId } = socket.data;

  // 1. Topic Key
  const topic = KeyFactory.ConversationTopic(conversationId);

  // 2. Logic: Unsubscribe
  wsRegistry.unsubscribe(socketId, topic);

  logger.info({
    msg: "Socket Unsubscribed from Channel",
    userId,
    conversationId,
    topic,
  });

  // 3. Ack
  socket.send(
    createSuccessFrame(undefined, "chat:ack-unsubscribe", {
      conversationId,
      status: "unsubscribed",
    })
  );
};
