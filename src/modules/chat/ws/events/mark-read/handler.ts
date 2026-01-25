import { Context } from "hono";
import { ChatWebSocket } from "@/infra/ws/types";
import { MarkReadInput } from "./schema";
import { logger } from "@/shared/logger";

export const markReadHandler = async (
  ctx: Context,
  socket: ChatWebSocket,
  input: MarkReadInput
) => {
  const { channelId, messageId } = input;
  const { userId } = socket.data;

  // TODO: Update 'channel_memberships.last_read_message_id' in DB
  // Optimization: Debounce this update or use a specialized worker.

  // TODO: Broadcast 'message-read' to other users (Blue ticks)

  logger.debug({ msg: "Mark Message Read", userId, channelId, messageId });
};
