import { Context } from "hono";
import { ChatDownstreamEvent } from "@/shared/contracts/chat/events";
import { GenericWebSocket, createSuccessFrame } from "@/infra/ws/core/types";
import { wsRegistry } from "@/infra/ws/subscription-registry";
import { UnsubscribeConversationInput } from "./schema";
import { logger } from "@/shared/logger";
import { KeyFactory } from "@/infra/redis/keys";

/**
 * Unified Conversation Unsubscription Handler
 * Supports: CHANNEL, DM, GROUP_DM, THREAD
 * Replaces: unsubscribe-channel + unsubscribe-thread
 */
export const unsubscribeConversationHandler = async (
  ctx: Context,
  socket: GenericWebSocket,
  input: UnsubscribeConversationInput
) => {
  const { conversationId } = input;
  const { userId, socketId } = socket.data;

  // 1. Unsubscribe from Pub/Sub Topic
  const topic = KeyFactory.ConversationTopic(conversationId);
  await wsRegistry.unsubscribe(socketId, topic);

  logger.info({
    msg: "Socket Unsubscribed from Conversation",
    userId,
    conversationId,
    topic,
  });

  // 2. Send ACK
  socket.send(
    createSuccessFrame(undefined, "chat:unsubscribe-ack", {
      conversationId,
      status: "unsubscribed",
    })
  );
};
