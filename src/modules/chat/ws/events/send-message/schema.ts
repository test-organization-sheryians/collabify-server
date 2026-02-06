/**
 * Send Message Schema
 *
 * Re-exports upstream contract from registry as single source of truth.
 */

import {
  SendMessagePayloadSchema,
  SendMessagePayload,
} from "@/shared/contracts/chat/upstream";

export const sendMessageSchema = SendMessagePayloadSchema;
export type SendMessageInput = SendMessagePayload;
