import { Context } from "hono";
import { ChatWebSocket, createSuccessFrame } from "@/infra/ws/types";
import { EditMessageInput } from "./schema";
import { logger } from "@/shared/logger";

export const editMessageHandler = async (
  ctx: Context,
  socket: ChatWebSocket,
  input: EditMessageInput
) => {
  const { messageId, channelId, content } = input;
  const { userId } = socket.data;

  // TODO: Verify Author (Select author_id from messages where id = ?)

  logger.info({ msg: "Processing Edit Message", userId, messageId });

  // TODO: Update DB (messages table)
  // TODO: Publish 'message-edited' event to Redis PubSub (Fanout)

  socket.send(
    createSuccessFrame(undefined, "chat:ack-edit", { messageId, status: "ok" })
  );
};
