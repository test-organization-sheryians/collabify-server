/**
 * Subscribe Conversation Schema
 *
 * Re-exports upstream contract from registry as single source of truth.
 */

import {
  SubscribeConversationPayloadSchema,
  SubscribeConversationPayload,
} from "@/shared/contracts/chat/upstream";

export const subscribeConversationSchema = SubscribeConversationPayloadSchema;
export type SubscribeConversationInput = SubscribeConversationPayload;
