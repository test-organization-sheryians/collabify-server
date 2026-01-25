import { editMessageHandler } from "./handler";
import { editMessageSchema } from "./schema";

export const editMessage = {
  handler: editMessageHandler,
  schema: editMessageSchema,
};
