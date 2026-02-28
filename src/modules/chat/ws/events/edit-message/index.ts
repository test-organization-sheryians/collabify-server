import { RouteDefinition } from "@/infra/ws/types";
import { editMessageHandler } from "./handler";
import { editMessageSchema } from "./schema";

export const editMessage: RouteDefinition = {
  schema: editMessageSchema,
  handler: editMessageHandler,
};
