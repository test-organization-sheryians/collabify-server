import { deleteMessageHandler } from "./handler";
import { deleteMessageSchema } from "./schema";

export const deleteMessage = {
  handler: deleteMessageHandler,
  schema: deleteMessageSchema,
};
