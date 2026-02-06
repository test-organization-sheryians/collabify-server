/**
 * Typing Start Schema
 *
 * Re-exports upstream contract from registry as single source of truth.
 */

import {
  TypingStartPayloadSchema,
  TypingStartPayload,
} from "@/shared/contracts/chat/upstream";

export const typingStartSchema = TypingStartPayloadSchema;
export type TypingStartInput = TypingStartPayload;
