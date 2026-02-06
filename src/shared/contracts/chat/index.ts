/**
 * Chat Domain Contracts - Public API
 *
 * This is the single entry point for all chat-related contracts.
 */

// Event enums
export { ChatUpstreamEvent, ChatDownstreamEvent } from "./events";

// Upstream exports
export type {
  SendMessagePayload,
  SendMessageContract,
  EditMessagePayload,
  EditMessageContract,
  DeleteMessagePayload,
  DeleteMessageContract,
  SubscribeConversationPayload,
  SubscribeConversationContract,
  UnsubscribeConversationPayload,
  UnsubscribeConversationContract,
  AddReactionPayload,
  AddReactionContract,
  RemoveReactionPayload,
  RemoveReactionContract,
  TypingStartPayload,
  TypingStartContract,
  TypingStopPayload,
  TypingStopContract,
  MarkReadPayload,
  MarkReadContract,
} from "./upstream";

export { ChatUpstreamSchemas } from "./upstream";

// Downstream exports
export type {
  NewMessagePayload,
  NewMessageContract,
  AckMessagePayload,
  AckMessageContract,
  MessageEditedPayload,
  MessageEditedContract,
  MessageDeletedPayload,
  MessageDeletedContract,
  ReactionAddedPayload,
  ReactionAddedContract,
  ReactionRemovedPayload,
  ReactionRemovedContract,
  UserTypingPayload,
  UserTypingContract,
  UserStopTypingPayload,
  UserStopTypingContract,
  MessageReadPayload,
  MessageReadContract,
  SyncRequiredPayload,
  SyncRequiredContract,
  SubscribeAckPayload,
  SubscribeAckContract,
} from "./downstream";

// Convenience namespace
import { ChatUpstreamEvent, ChatDownstreamEvent } from "./events";

export const Events = {
  Upstream: ChatUpstreamEvent,
  Downstream: ChatDownstreamEvent,
} as const;
