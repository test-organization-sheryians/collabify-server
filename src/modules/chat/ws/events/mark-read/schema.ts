/**
 * Mark Read Schema
 *
 * Re-exports upstream contract from registry as single source of truth.
 */

import {
  MarkReadPayloadSchema,
  MarkReadPayload,
} from "@/shared/contracts/chat/upstream";

export const markReadSchema = MarkReadPayloadSchema;
export type MarkReadInput = MarkReadPayload;
