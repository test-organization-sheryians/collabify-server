import type { DeltaMessageRow } from "./fetch-delta";

/**
 * buildDeltaResponse — pure pagination logic for get-messages-delta.
 * Pops the look-ahead row, computes hasMore and lastSequence.
 * Fixed lastSequence computation: || → ?? (nullish coalescing).
 */
export function buildDeltaResponse(messages: DeltaMessageRow[], limit: number, afterSequence: number | undefined) {
  const hasMore = messages.length > limit;
  if (hasMore) messages.pop(); // Remove the sentinel row

  const lastMsg = messages[messages.length - 1];
  const lastSequence = lastMsg?.sequence ?? afterSequence ?? 0;

  return { messages, hasMore, lastSequence };
}
