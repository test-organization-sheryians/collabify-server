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
 * Additionally reconstructs rich content by merging message text with
 * associated mentions. This ensures GraphQL responses match the format
 * expected by the client (RichChatContent).
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
      content: reconstructRichContent(m),
      replyCount: 0,
      isEdited: false,
      editedAt: null,
    })),
    hasMore,
    minSequence,
  };
}

/**
 * Reconstruct rich content from message content and mentions.
 *
 * Returns:
 * - Plain string if no mentions exist (legacy messages)
 * - { text, mentions } object if mentions exist (rich format for client)
 *
 * The client (RichChatContent) expects mentions to be in the format:
 * { entityId, entityType, displayText, offset }
 */
function reconstructRichContent(
  message: MessageRow & {
    mentions: Array<{
      id: string;
      targetEntityId: string;
      targetEntityType: string;
      displayText: string;
    }>;
  }
): string | { text: string; mentions: Array<{ entityId: string; entityType: string; displayText: string; offset: number }> } {
  // Extract text from content (may be { text, schemaVersion } or plain string)
  let text: string;
  if (message.content && typeof message.content === "object") {
    const contentObj = message.content as Record<string, unknown>;
    text = (typeof contentObj.text === "string" ? contentObj.text : String(message.content)) as string;
  } else {
    text = String(message.content ?? "");
  }

  // If no mentions, return plain text
  if (!message.mentions || message.mentions.length === 0) {
    return text;
  }

  // Reconstruct { text, mentions } format with offsets
  // Note: Offset is set to 0 as client computes position from displayText scanning
  return {
    text,
    mentions: message.mentions.map((m) => ({
      entityId: m.targetEntityId,
      entityType: m.targetEntityType,
      displayText: m.displayText,
      offset: 0, // Client computes offset based on @displayText position in text
    })),
  };
}
