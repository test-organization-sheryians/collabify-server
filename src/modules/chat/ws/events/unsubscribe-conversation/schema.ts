/**
 * Unsubscribe Conversation Schema
 *
 * Re-exports upstream contract from registry as single source of truth.
 */

import {
  UnsubscribeConversationPayloadSchema,
  UnsubscribeConversationPayload,
} from "@/shared/contracts/chat/upstream";

export const unsubscribeConversationSchema =
  UnsubscribeConversationPayloadSchema;
export type UnsubscribeConversationInput = UnsubscribeConversationPayload;
