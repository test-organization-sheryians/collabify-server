/**
 * Sync Reactions Schema
 *
 * Re-exports upstream contract from registry as single source of truth.
 */

import { z } from "zod";

// Sync reactions uses a simple inline schema
export const syncReactionsSchema = z.object({
  conversationId: z.string(),
  lastEventId: z.string().optional(), // Last event ID for delta sync
});

export type SyncReactionsInput = z.infer<typeof syncReactionsSchema>;
