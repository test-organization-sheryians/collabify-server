/**
 * Typing Stop Schema
 *
 * Re-exports upstream contract from registry as single source of truth.
 */

import {
  TypingStopPayloadSchema,
  TypingStopPayload,
} from "@/shared/contracts/chat/upstream";

export const typingStopSchema = TypingStopPayloadSchema;
export type TypingStopInput = TypingStopPayload;
