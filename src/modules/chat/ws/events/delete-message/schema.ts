/**
 * Delete Message Schema
 *
 * Re-exports upstream contract from registry as single source of truth.
 */

import {
  DeleteMessagePayloadSchema,
  DeleteMessagePayload,
} from "@/shared/contracts/chat/upstream";

export const deleteMessageSchema = DeleteMessagePayloadSchema;
export type DeleteMessageInput = DeleteMessagePayload;
