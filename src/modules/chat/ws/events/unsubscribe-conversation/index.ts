import { RouteDefinition } from "@/infra/ws/types";
import { unsubscribeConversationHandler } from "./handler";
import { unsubscribeConversationSchema } from "./schema";

export const unsubscribeConversation: RouteDefinition = {
  schema: unsubscribeConversationSchema,
  handler: unsubscribeConversationHandler,
};
