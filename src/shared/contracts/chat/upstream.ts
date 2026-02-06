import { z } from "zod";
import type { UpstreamContract } from "../types";
import { ChatUpstreamEvent } from "./events";

// ============================================================================
// Zod Schemas (for runtime validation)
// ============================================================================

export const SendMessagePayloadSchema = z.object({
  conversationId: z.string().min(1),
  dedupeId: z.string().uuid(),
  content: z.string().min(1).max(4000),
  parentMessageId: z.string().optional(),
  conversationType: z.enum(["CHANNEL", "DM", "GROUP_DM", "THREAD"]).optional(),
});

export const EditMessagePayloadSchema = z.object({
  messageId: z.string(),
  content: z.string().min(1).max(4000),
  nonce: z.string(), // Required for idempotency tracking
});

export const DeleteMessagePayloadSchema = z.object({
  messageId: z.string(),
  nonce: z.string(), // Required for idempotency tracking
});

export const SubscribeConversationPayloadSchema = z.object({
  conversationId: z.string(),
  conversationType: z.enum(["CHANNEL", "DM", "GROUP_DM", "THREAD"]),
  lastSequence: z.number().optional(),
  epoch: z.string().optional(),
});

export const UnsubscribeConversationPayloadSchema = z.object({
  conversationId: z.string(),
});

export const AddReactionPayloadSchema = z.object({
  messageId: z.string(),
  emoji: z.string(),
  tempId: z.string().optional(), // Client-generated ID for optimistic updates
});

export const RemoveReactionPayloadSchema = z.object({
  messageId: z.string(),
  emoji: z.string(),
});

export const TypingStartPayloadSchema = z.object({
  conversationId: z.string(),
  nonce: z.string().optional(), // Optional request ID
});

export const TypingStopPayloadSchema = z.object({
  conversationId: z.string(),
  nonce: z.string().optional(), // Optional request ID
});

export const MarkReadPayloadSchema = z.object({
  conversationId: z.string(),
  messageId: z.string(),
  watermarkId: z.string(), // Last read message ID for watermark tracking
  nonce: z.string(), // Required for idempotency tracking
});

// ============================================================================
// TypeScript Types
// ============================================================================

export type SendMessagePayload = z.infer<typeof SendMessagePayloadSchema>;
export type EditMessagePayload = z.infer<typeof EditMessagePayloadSchema>;
export type DeleteMessagePayload = z.infer<typeof DeleteMessagePayloadSchema>;
export type SubscribeConversationPayload = z.infer<
  typeof SubscribeConversationPayloadSchema
>;
export type UnsubscribeConversationPayload = z.infer<
  typeof UnsubscribeConversationPayloadSchema
>;
export type AddReactionPayload = z.infer<typeof AddReactionPayloadSchema>;
export type RemoveReactionPayload = z.infer<typeof RemoveReactionPayloadSchema>;
export type TypingStartPayload = z.infer<typeof TypingStartPayloadSchema>;
export type TypingStopPayload = z.infer<typeof TypingStopPayloadSchema>;
export type MarkReadPayload = z.infer<typeof MarkReadPayloadSchema>;

// ============================================================================
// Contracts
// ============================================================================

export type SendMessageContract = UpstreamContract<
  ChatUpstreamEvent.SendMessage,
  SendMessagePayload
>;

export type EditMessageContract = UpstreamContract<
  ChatUpstreamEvent.EditMessage,
  EditMessagePayload
>;

export type DeleteMessageContract = UpstreamContract<
  ChatUpstreamEvent.DeleteMessage,
  DeleteMessagePayload
>;

export type SubscribeConversationContract = UpstreamContract<
  ChatUpstreamEvent.SubscribeConversation,
  SubscribeConversationPayload
>;

export type UnsubscribeConversationContract = UpstreamContract<
  ChatUpstreamEvent.UnsubscribeConversation,
  UnsubscribeConversationPayload
>;

export type AddReactionContract = UpstreamContract<
  ChatUpstreamEvent.AddReaction,
  AddReactionPayload
>;

export type RemoveReactionContract = UpstreamContract<
  ChatUpstreamEvent.RemoveReaction,
  RemoveReactionPayload
>;

export type TypingStartContract = UpstreamContract<
  ChatUpstreamEvent.TypingStart,
  TypingStartPayload
>;

export type TypingStopContract = UpstreamContract<
  ChatUpstreamEvent.TypingStop,
  TypingStopPayload
>;

export type MarkReadContract = UpstreamContract<
  ChatUpstreamEvent.MarkRead,
  MarkReadPayload
>;

// ============================================================================
// Schema Registry (for router validation)
// ============================================================================

export const ChatUpstreamSchemas = {
  [ChatUpstreamEvent.SendMessage]: SendMessagePayloadSchema,
  [ChatUpstreamEvent.EditMessage]: EditMessagePayloadSchema,
  [ChatUpstreamEvent.DeleteMessage]: DeleteMessagePayloadSchema,
  [ChatUpstreamEvent.SubscribeConversation]: SubscribeConversationPayloadSchema,
  [ChatUpstreamEvent.UnsubscribeConversation]:
    UnsubscribeConversationPayloadSchema,
  [ChatUpstreamEvent.AddReaction]: AddReactionPayloadSchema,
  [ChatUpstreamEvent.RemoveReaction]: RemoveReactionPayloadSchema,
  [ChatUpstreamEvent.TypingStart]: TypingStartPayloadSchema,
  [ChatUpstreamEvent.TypingStop]: TypingStopPayloadSchema,
  [ChatUpstreamEvent.MarkRead]: MarkReadPayloadSchema,
  [ChatUpstreamEvent.SyncReactions]: z.object({ conversationId: z.string() }),
} as const;
