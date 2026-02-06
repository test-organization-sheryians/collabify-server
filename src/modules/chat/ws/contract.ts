/*
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║                    ⚠️  DEPRECATED FILE  ⚠️                    ║
 * ║                                                               ║
 * ║  This file is deprecated and will be removed in v2.0.0       ║
 * ║  Use: @/shared/contracts/registry instead                    ║
 * ║                                                               ║
 * ╚═══════════════════════════════════════════════════════════════╝
 *
 * MIGRATION GUIDE
 * ===============
 *
 * Old (deprecated):
 * ```typescript
 * import { NewMessagePayload } from '@/modules/chat/ws/contract'
 * ```
 *
 * New (use instead):
 * ```typescript
 * import { Chat } from '@/shared/contracts/registry'
 *
 * // Event enums
 * Chat.Events.Downstream.NewMessage
 *
 * // Payload types
 * const payload: Chat.NewMessagePayload = {...}
 * ```
 *
 * WHY MIGRATE?
 * - Type-safe event names (enums vs strings)
 * - Single source of truth across frontend/backend
 * - Better IDE autocomplete and refactoring support
 *
 * @deprecated Use @/shared/contracts/registry instead
 */

import { z } from "zod";

/**
 * UPSTREAM PAYLOADS (Client -> Server)
 * Must strictly validate input.
 *
 * @deprecated Use Chat.SendMessagePayload from @/shared/contracts/registry
 */
export const SendMessagePayloadSchema = z.object({
  conversationId: z.string().min(1),
  // Deduplication logic relies on client-gen UUID
  dedupeId: z.string().uuid(),
  content: z.string().min(1).max(4000),
  // Future: attachments, replyToId, etc.
});

/**
 * @deprecated Use Chat.SendMessagePayload from @/shared/contracts/registry
 */
export type SendMessagePayload = z.infer<typeof SendMessagePayloadSchema>;

/**
 * DOWNSTREAM PAYLOADS (Server -> Client)
 * What the client receives.
 *
 * @deprecated Use Chat.NewMessagePayload from @/shared/contracts/registry
 */
export const NewMessageSchema = z.object({
  type: z.literal("chat:new-message"),
  data: z.object({
    streamId: z.string(), // The authoritative ID
    conversationId: z.string().min(1),
    messageId: z.string().min(1).optional(), // If persisted immediately (Optional in stream phase)
    authorId: z.string().min(1),
    content: z.string(),
    createdAt: z.string().datetime(),
    sequence: z.number().int().min(0), // Dual-Sequencing: Logical Order
    // dedupeId is useful for client to double-check their own optimistically rendered message
    dedupeId: z.string().min(1).optional(),
  }),
});

/**
 * @deprecated Use Chat.NewMessageContract from @/shared/contracts/registry
 */
export type NewMessageEvent = z.infer<typeof NewMessageSchema>;

/**
 * @deprecated Use Chat contracts from @/shared/contracts/registry
 */
export const OutboundEnvelopeSchema = z.discriminatedUnion("type", [
  NewMessageSchema,
  // Add others: user-typing, etc.
]);

/**
 * @deprecated Use Chat contracts from @/shared/contracts/registry
 */
export type OutboundEnvelope = z.infer<typeof OutboundEnvelopeSchema>;
