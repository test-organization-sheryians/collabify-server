import { RouteMap } from "@/infra/ws/types";
import { subscribeConversation } from "./events/subscribe-conversation";
import { unsubscribeConversation } from "./events/unsubscribe-conversation";
import { sendMessage } from "./events/send-message";
import { editMessage } from "./events/edit-message";
import { deleteMessage } from "./events/delete-message";
import { typingStart } from "./events/typing-start";
import { typingStop } from "./events/typing-stop";
import { markRead } from "./events/mark-read";
import addReaction from "./events/add-reaction";
import removeReaction from "./events/remove-reaction";
import syncReactions from "./events/sync-reactions";

export const chatWSRoutes: RouteMap = {
  // Unified Subscription Cycle (All Conversation Types)
  "chat:subscribe-conversation": subscribeConversation,
  "chat:unsubscribe-conversation": unsubscribeConversation,

  // Message Actions
  "chat:send-message": sendMessage,
  "chat:edit-message": editMessage,
  "chat:delete-message": deleteMessage,

  // Reactions
  "chat:add-reaction": addReaction,
  "chat:remove-reaction": removeReaction,
  "chat:sync-reactions": syncReactions,

  // Ephemeral State (Typing Indicators)
  "chat:typing-start": typingStart,
  "chat:typing-stop": typingStop,

  // Read Receipts
  "chat:mark-read": markRead,
};
