import { RouteDefinition } from "@/infra/ws/types";
import { deleteMessageHandler } from "./handler";
import { deleteMessageSchema } from "./schema";

export const deleteMessage: RouteDefinition = {
  schema: deleteMessageSchema,
  handler: deleteMessageHandler,
};
