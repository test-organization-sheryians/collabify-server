import { Context } from "hono";
import { ChatWebSocket, createSuccessFrame } from "@/infra/ws/types";
import { wsRegistry } from "@/infra/ws/subscription-registry";
import { UnsubscribeThreadInput } from "./schema";
import { logger } from "@/shared/logger";

export const unsubscribeThreadHandler = async (
  ctx: Context,
  socket: ChatWebSocket,
  input: UnsubscribeThreadInput
) => {
  const { threadId } = input;
  const { userId, socketId } = socket.data;

  // 1. Topic Key
  const topic = `thread:${threadId}`;

  // 2. Logic: Unsubscribe
  wsRegistry.unsubscribe(socketId, topic);

  logger.info({
    msg: "Socket Unsubscribed from Thread",
    userId,
    threadId,
    topic,
  });

  // 3. Ack
  socket.send(
    createSuccessFrame(undefined, "chat:ack-unsubscribe-thread", {
      threadId,
      status: "unsubscribed",
    })
  );
};
