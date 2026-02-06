/**
 * Chat Event Names
 *
 * CRITICAL: Must match frontend exactly
 * Frontend: client/src/shared/contracts/chat/events.ts
 *
 * These enums replace all hard-coded string literals for type safety.
 */

/**
 * Upstream Events (Client → Server)
 */
export enum ChatUpstreamEvent {
  // Subscriptions
  SubscribeConversation = "chat:subscribe-conversation",
  UnsubscribeConversation = "chat:unsubscribe-conversation",

  // Messages
  SendMessage = "chat:send-message",
  EditMessage = "chat:edit-message",
  DeleteMessage = "chat:delete-message",

  // Reactions
  AddReaction = "chat:add-reaction",
  RemoveReaction = "chat:remove-reaction",
  SyncReactions = "chat:sync-reactions",

  // Typing
  TypingStart = "chat:typing-start",
  TypingStop = "chat:typing-stop",

  // Read Receipts
  MarkRead = "chat:mark-read",
}

/**
 * Downstream Events (Server → Client)
 */
export enum ChatDownstreamEvent {
  // Message Events
  NewMessage = "chat:new-message",
  AckMessage = "chat:ack-message",
  MessageEdited = "chat:message-edited",
  MessageDeleted = "chat:message-deleted",

  // Reactions
  ReactionAdded = "chat:reaction-added",
  ReactionRemoved = "chat:reaction-removed",

  // Typing
  UserTyping = "chat:user-typing",
  UserStopTyping = "chat:user-stop-typing",

  // Read Receipts
  MessageRead = "chat:message-read",

  // Sync
  SyncRequired = "chat:sync-required",
  SubscribeAck = "chat:subscribe-ack",
}
