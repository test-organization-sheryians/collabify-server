import type { DeltaMessageRow } from "./fetch-delta";

/**
 * buildDeltaResponse — pure pagination logic for get-messages-delta.
 * Pops the look-ahead row, computes hasMore and lastSequence.
 * Also reconstructs rich content by merging message text with mentions.
 */
export function buildDeltaResponse(
  messages: DeltaMessageRow[],
  limit: number,
  afterSequence: number | undefined
) {
  const hasMore = messages.length > limit;
  if (hasMore) messages.pop(); // Remove the sentinel row

  const lastMsg = messages[messages.length - 1];
  const lastSequence = lastMsg?.sequence ?? afterSequence ?? 0;

  return {
    messages: messages.map((m) => ({
      ...m,
      content: reconstructRichContent(m),
    })),
    hasMore,
    lastSequence,
  };
}

/**
 * Reconstruct rich content from message content and mentions.
 * Same logic as get-history/build-response.ts
 */
function reconstructRichContent(
  message: DeltaMessageRow
): string | { text: string; mentions: Array<{ entityId: string; entityType: string; displayText: string; offset: number }> } {
  // Extract text from content
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

  // Compute correct offsets by scanning text for @displayText patterns
  const mentions = message.mentions.map((m) => {
    const pattern = `@${m.displayText}`;
    const offset = text.indexOf(pattern);
    return {
      entityId: m.targetEntityId,
      entityType: m.targetEntityType,
      displayText: m.displayText,
      offset: offset >= 0 ? offset : 0,
    };
  });

  return { text, mentions };
}
