import { z } from "zod";

/**
 * UPSTREAM PAYLOADS (Client -> Server)
 * Must strictly validate input.
 */

export const SendMessagePayloadSchema = z.object({
  conversationId: z.string().uuid(),
  // Deduplication logic relies on client-gen UUID
  dedupeId: z.string().uuid(),
  content: z.string().min(1).max(4000),
  // Future: attachments, replyToId, etc.
});

export type SendMessagePayload = z.infer<typeof SendMessagePayloadSchema>;

/**
 * DOWNSTREAM PAYLOADS (Server -> Client)
 * What the client receives.
 */

export const NewMessageSchema = z.object({
  type: z.literal("chat:new-message"),
  data: z.object({
    streamId: z.string(), // The authoritative ID
    conversationId: z.string().uuid(),
    messageId: z.string().uuid().optional(), // If persisted immediately (Optional in stream phase)
    authorId: z.string().uuid(),
    content: z.string(),
    createdAt: z.string().datetime(),
    // dedupeId is useful for client to double-check their own optimistically rendered message
    dedupeId: z.string().uuid().optional(),
  }),
});

export type NewMessageEvent = z.infer<typeof NewMessageSchema>;

export const OutboundEnvelopeSchema = z.discriminatedUnion("type", [
  NewMessageSchema,
  // Add others: user-typing, etc.
]);

export type OutboundEnvelope = z.infer<typeof OutboundEnvelopeSchema>;
