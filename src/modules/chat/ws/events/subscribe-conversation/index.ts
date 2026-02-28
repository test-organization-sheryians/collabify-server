import { RouteDefinition } from "@/infra/ws/types";
import { subscribeConversationHandler } from "./handler";
import { subscribeConversationSchema } from "./schema";

export const subscribeConversation: RouteDefinition = {
  schema: subscribeConversationSchema,
  handler: subscribeConversationHandler,
};
