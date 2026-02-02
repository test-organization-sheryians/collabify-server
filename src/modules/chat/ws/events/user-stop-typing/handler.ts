import { WSHandlerContext } from "@/infra/ws/types";
import { ChatWebSocket } from "@/infra/ws/types";
import { UserStopTypingInput } from "./schema";
import { logger } from "@/shared/logger";

export const userStopTypingHandler = async (
  ctx: WSHandlerContext,
  socket: ChatWebSocket,
  input: UserStopTypingInput
) => {
  const { channelId } = input;
  const { userId } = socket.data;

  // TODO: Publish 'user-stop-typing' to Redis PubSub

  logger.debug({ msg: "User Stop Typing", userId, channelId });
};
