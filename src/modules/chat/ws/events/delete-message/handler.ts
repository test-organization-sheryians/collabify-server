import { Context } from "hono";
import { ChatWebSocket, createSuccessFrame } from "@/infra/ws/types";
import { DeleteMessageInput } from "./schema";
import { logger } from "@/shared/logger";

export const deleteMessageHandler = async (
  ctx: Context,
  socket: ChatWebSocket,
  input: DeleteMessageInput
) => {
  const { messageId, channelId } = input;
  const { userId } = socket.data;

  // TODO: Verify Author or Admin Permissions

  logger.info({ msg: "Processing Delete Message", userId, messageId });

  // TODO: Soft Delete in DB (set deleted_at)
  // TODO: Publish 'message-deleted' event to Redis (Fanout)

  socket.send(
    createSuccessFrame(undefined, "chat:ack-delete", {
      messageId,
      status: "ok",
    })
  );
};
