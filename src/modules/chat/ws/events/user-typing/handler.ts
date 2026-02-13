import { WSHandlerContext } from "@/infra/ws/types";
import { ChatWebSocket } from "@/infra/ws/types";
import { UserTypingInput } from "./schema";
import { createLogger } from "@/shared/lib/logger";

const logger = createLogger("chat:ws:user-typing");

export const userTypingHandler = async (
  ctx: WSHandlerContext,
  socket: ChatWebSocket,
  input: UserTypingInput
) => {
  const { channelId } = input;
  const { userId } = socket.data;

  // No Ack Needed for Typing (Fire & Forget)

  // TODO: Publish 'user-typing' to Redis PubSub (Ephemeral)
  // Do NOT persist to DB.

  logger.debug("User Typing", { userId, channelId });
};
