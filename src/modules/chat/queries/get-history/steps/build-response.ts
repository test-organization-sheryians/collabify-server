import type { MessageRow } from "./fetch-messages";

/**
 * buildResponse — pure mapping step, no IO, no side effects.
 *
 * Computes the HistoryPayload from raw DB rows:
 *  - Slices the limit+1 sentinel row to determine hasMore
 *  - Extracts minSequence from the last item in the slice (lowest sequence
 *    value, since rows are ordered DESC — used as the next cursor)
 *  - Returns null minSequence when there are no messages
 *
 * Messages remain in DESC sequence order (newest→oldest) — consistent with
 * cursor-based "scroll back" pagination on the client side.
 */
export function buildResponse(messages: MessageRow[], limit: number) {
  const hasMore = messages.length > limit;
  const sliced = hasMore ? messages.slice(0, limit) : messages;

  const minSequence =
    sliced.length > 0 ? sliced[sliced.length - 1]!.sequence : null;

  return {
    // Stub values for computed ChatMessage fields.
    // The ChatMessage field resolvers in resolvers.ts (replyCount, isEdited, editedAt)
    // override these at query time — stubs are needed only to satisfy the GQL type.
    messages: sliced.map((m) => ({
      ...m,
      replyCount: 0,
      isEdited: false,
      editedAt: null,
    })),
    hasMore,
    minSequence,
  };
}
