import type { DownstreamContract } from "../types";
import { ChatDownstreamEvent } from "./events";

// ============================================================================
// Payload Interfaces
// CRITICAL: Must match frontend exactly!
// Frontend: client/src/shared/contracts/chat/downstream.ts
// ============================================================================

export interface NewMessagePayload {
  messageId: string;
  streamId: string;
  dedupeId: string;
  conversationId: string;
  authorId: string;
  content: string;
  createdAt: string; // ISO 8601
  sequence: number;
  threadId?: string;
  meta?: {
    replay?: boolean;
  };
}

export interface AckMessagePayload {
  dedupeId: string;
  status: "sent" | "pending" | "failed";
  streamId?: string;
  sequence?: number;
  error?: string;
}

export interface MessageEditedPayload {
  messageId: string;
  conversationId: string;
  content: string;
  editedAt: string;
}

export interface MessageDeletedPayload {
  messageId: string;
  conversationId: string;
  deletedAt: string;
}

export interface ReactionAddedPayload {
  messageId: string;
  conversationId: string;
  userId: string;
  emoji: string;
}

export interface ReactionRemovedPayload {
  messageId: string;
  conversationId: string;
  userId: string;
  emoji: string;
}

export interface UserTypingPayload {
  conversationId: string;
  userId: string;
  userName: string;
}

export interface UserStopTypingPayload {
  conversationId: string;
  userId: string;
}

export interface MessageReadPayload {
  conversationId: string;
  messageId: string;
  userId: string;
  readAt: string;
}

export interface SyncRequiredPayload {
  conversationId: string;
  reason: string;
}

export interface SubscribeAckPayload {
  conversationId: string;
  success: boolean;
}

// ============================================================================
// Contracts
// ============================================================================

export type NewMessageContract = DownstreamContract<
  ChatDownstreamEvent.NewMessage,
  NewMessagePayload
>;

export type AckMessageContract = DownstreamContract<
  ChatDownstreamEvent.AckMessage,
  AckMessagePayload
>;

export type MessageEditedContract = DownstreamContract<
  ChatDownstreamEvent.MessageEdited,
  MessageEditedPayload
>;

export type MessageDeletedContract = DownstreamContract<
  ChatDownstreamEvent.MessageDeleted,
  MessageDeletedPayload
>;

export type ReactionAddedContract = DownstreamContract<
  ChatDownstreamEvent.ReactionAdded,
  ReactionAddedPayload
>;

export type ReactionRemovedContract = DownstreamContract<
  ChatDownstreamEvent.ReactionRemoved,
  ReactionRemovedPayload
>;

export type UserTypingContract = DownstreamContract<
  ChatDownstreamEvent.UserTyping,
  UserTypingPayload
>;

export type UserStopTypingContract = DownstreamContract<
  ChatDownstreamEvent.UserStopTyping,
  UserStopTypingPayload
>;

export type MessageReadContract = DownstreamContract<
  ChatDownstreamEvent.MessageRead,
  MessageReadPayload
>;

export type SyncRequiredContract = DownstreamContract<
  ChatDownstreamEvent.SyncRequired,
  SyncRequiredPayload
>;

export type SubscribeAckContract = DownstreamContract<
  ChatDownstreamEvent.SubscribeAck,
  SubscribeAckPayload
>;
