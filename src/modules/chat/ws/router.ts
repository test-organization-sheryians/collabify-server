import { RouteMap } from "@/infra/ws/core/types";
import { ChatUpstreamEvent } from "@/shared/contracts/chat/events";
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
  [ChatUpstreamEvent.SubscribeConversation]: subscribeConversation,
  [ChatUpstreamEvent.UnsubscribeConversation]: unsubscribeConversation,

  // Message Actions
  [ChatUpstreamEvent.SendMessage]: sendMessage,
  [ChatUpstreamEvent.EditMessage]: editMessage,
  [ChatUpstreamEvent.DeleteMessage]: deleteMessage,

  // Reactions
  [ChatUpstreamEvent.AddReaction]: addReaction,
  [ChatUpstreamEvent.RemoveReaction]: removeReaction,
  [ChatUpstreamEvent.SyncReactions]: syncReactions,

  // Ephemeral State (Typing Indicators)
  [ChatUpstreamEvent.TypingStart]: typingStart,
  [ChatUpstreamEvent.TypingStop]: typingStop,

  // Read Receipts
  [ChatUpstreamEvent.MarkRead]: markRead,
};
