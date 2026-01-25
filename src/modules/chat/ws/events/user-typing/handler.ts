import { Context } from "hono";
import { ChatWebSocket } from "@/infra/ws/types";
import { UserTypingInput } from "./schema";
import { logger } from "@/shared/logger";

export const userTypingHandler = async (
  ctx: Context,
  socket: ChatWebSocket,
  input: UserTypingInput
) => {
  const { channelId } = input;
  const { userId } = socket.data;

  // No Ack Needed for Typing (Fire & Forget)

  // TODO: Publish 'user-typing' to Redis PubSub (Ephemeral)
  // Do NOT persist to DB.

  logger.debug({ msg: "User Typing", userId, channelId });
};
