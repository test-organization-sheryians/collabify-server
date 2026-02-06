/**
 * Remove Reaction Schema
 *
 * Re-exports upstream contract from registry as single source of truth.
 */

import {
  RemoveReactionPayloadSchema,
  RemoveReactionPayload,
} from "@/shared/contracts/chat/upstream";

export const removeReactionSchema = RemoveReactionPayloadSchema;
export type RemoveReactionInput = RemoveReactionPayload;
