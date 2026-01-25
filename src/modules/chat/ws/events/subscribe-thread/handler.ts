import { Context } from "hono";
import { ChatWebSocket, createSuccessFrame } from "@/infra/ws/types";
import { wsRegistry } from "@/infra/ws/subscription-registry";
import { SubscribeThreadInput } from "./schema";
import { logger } from "@/shared/logger";

export const subscribeThreadHandler = async (
  ctx: Context,
  socket: ChatWebSocket,
  input: SubscribeThreadInput
) => {
  const { threadId } = input;
  const { userId, socketId } = socket.data;

  // 1. Topic Key: Namespaced
  const topic = `thread:${threadId}`;

  // 2. Logic: Subscribe
  wsRegistry.subscribe(socketId, topic);

  logger.info({ msg: "Socket Subscribed to Thread", userId, threadId, topic });

  // 3. Ack
  socket.send(
    createSuccessFrame(undefined, "chat:ack-subscribe-thread", {
      threadId,
      status: "subscribed",
    })
  );
};
