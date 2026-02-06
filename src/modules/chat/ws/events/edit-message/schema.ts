/**
 * Edit Message Schema
 *
 * Re-exports upstream contract from registry as single source of truth.
 */

import {
  EditMessagePayloadSchema,
  EditMessagePayload,
} from "@/shared/contracts/chat/upstream";

export const editMessageSchema = EditMessagePayloadSchema;
export type EditMessageInput = EditMessagePayload;
