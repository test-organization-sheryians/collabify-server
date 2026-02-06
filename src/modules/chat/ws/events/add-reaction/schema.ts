/**
 * Add Reaction Schema
 *
 * Re-exports upstream contract from registry as single source of truth.
 */

import {
  AddReactionPayloadSchema,
  AddReactionPayload,
} from "@/shared/contracts/chat/upstream";

export const addReactionSchema = AddReactionPayloadSchema;
export type AddReactionInput = AddReactionPayload;
