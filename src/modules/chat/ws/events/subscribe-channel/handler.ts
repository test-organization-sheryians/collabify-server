import { ChatWebSocket, createSuccessFrame } from "@/infra/ws/types";
import { Context } from "hono";
import { SubscribeChannelInput } from "./schema";
import { wsRegistry } from "@/infra/ws/subscription-registry";
import { logger } from "@/shared/logger";
import { KeyFactory } from "@/infra/redis/keys";

export const subscribeChannelHandler = async (
  ctx: Context,
  socket: ChatWebSocket,
  input: SubscribeChannelInput
) => {
  const { conversationId } = input;
  const { userId, socketId } = socket.data;

  // 1. Logic: Subscribe logic is in Registry
  const topic = KeyFactory.ConversationTopic(conversationId);
  wsRegistry.subscribe(socketId, topic);

  logger.info({
    msg: "Socket Subscribed to Channel",
    userId,
    conversationId,
    topic,
  });

  // 2. Ack
  socket.send(
    createSuccessFrame(undefined, "chat:subscribe-ack", {
      conversationId,
      status: "subscribed",
    })
  );
};
