import { createLogger } from "@/shared/lib/logger";
import { AppError } from "@/shared/errors";
import type { ServiceContext } from "@/graphql/types";
import type { GetMessagesAfterCursorInput } from "./schema";
import { assertAccess } from "./steps/assert-access";
import { fetchMessagesAfterCursor, type MessageAfterCursorRow } from "./steps/fetch-messages-after-cursor";

const log = createLogger("chat:queries:get-messages-after-cursor");

/**
 * getMessagesAfterCursor — fetches messages after a cursor for gap-fill /
 * forward sync (sequence > cursor, ASC order).
 *
 * Steps:
 *  1. assertAccess           — channel auth gate (getChannel + assertChannelMember + permissions.assert)
 *  2. fetchMessagesAfterCursor — DB findMany with cursor + explicit select
 *
 * @throws AppError 401  if not authenticated
 * @throws AppError 404  if channel not found
 * @throws AppError 403  if not a member or lacks conversation:read
 */
export const handler = async (
  input: GetMessagesAfterCursorInput,
  ctx: ServiceContext
) => {
  try {
    if (!ctx.auth?.userId) throw AppError.unauthorized();
    await assertAccess(input.channelId, ctx);
    const messages = await fetchMessagesAfterCursor(input, ctx);

    // Reconstruct rich content with mentions
    return messages.map((m) => ({
      ...m,
      content: reconstructRichContent(m),
    }));
  } catch (err) {
    if (err instanceof AppError) throw err;
    log.error("[get-messages-after-cursor] Unexpected failure", {
      err,
      channelId: input.channelId,
    });
    throw err;
  }
};

/**
 * Reconstruct rich content from message content and mentions.
 * Computes correct offsets by scanning text for @displayText patterns.
 */
function reconstructRichContent(
  message: MessageAfterCursorRow
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
