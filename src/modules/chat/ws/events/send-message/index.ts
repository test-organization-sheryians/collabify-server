import { sendMessageHandler } from "./handler";
import { sendMessageSchema } from "./schema";

export const sendMessage = {
  handler: sendMessageHandler,
  schema: sendMessageSchema,
};
