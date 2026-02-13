import { Context } from "hono";
import { ChatWebSocket, createSuccessFrame } from "@/infra/ws/types";
import { wsRegistry } from "@/infra/ws/subscription-registry";
import { UnsubscribeConversationInput } from "./schema";
import { createLogger } from "@/shared/lib/logger";

const logger = createLogger("chat:ws:unsubscribe");
import { KeyFactory } from "@/infra/redis/keys";

/**
 * Unified Conversation Unsubscription Handler
 * Supports: CHANNEL, DM, GROUP_DM, THREAD
 * Replaces: unsubscribe-channel + unsubscribe-thread
 */
export const unsubscribeConversationHandler = async (
  ctx: Context,
  socket: ChatWebSocket,
  input: UnsubscribeConversationInput
) => {
  const { conversationId } = input;
  const { userId, socketId } = socket.data;

  // 1. Unsubscribe from Pub/Sub Topic
  const topic = KeyFactory.ConversationTopic(conversationId);
  await wsRegistry.unsubscribe(socketId, topic);

  logger.info("Socket Unsubscribed from Conversation", {
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
