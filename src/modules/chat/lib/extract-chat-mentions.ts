/**
 * extract-chat-mentions.ts
 *
 * Parses the `content` field of a chat message and extracts non-USER
 * mention references. These are used by persistMessageHandler to create
 * Tier 3 mention + backlink records after the ChatMessage row is committed.
 *
 * Spec alignment:
 *   - USER mentions → Tier 1 (notification only) → NO backlink created here.
 *   - All other entity types → Tier 3 (lightweight chat backlink).
 *
 * @layer chat/lib
 */

export interface ChatMentionRef {
  entityId:    string
  entityType:  string
  displayText: string
  offset:      number
}

/**
 * Parse a chat message `content` field (either a plain string or the
 * structured `{ text, mentions }` JSON object) and return non-USER refs.
 *
 * Returns an empty array for:
 *   - Legacy plain-text messages (no mentions)
 *   - Malformed / non-JSON content
 *   - Content with no `.mentions` array
 *   - All-USER mention lists (filtered out)
 */
export function extractChatMentions(content: unknown): ChatMentionRef[] {
  let parsed: unknown = content

  // If stored as a Prisma JSON object, content.text holds the raw string.
  // The structured value is nested inside content.mentions (from the DB layer).
  // Handle BOTH shapes:
  //   Shape A (DB write): { text: string, schemaVersion: number } — legacy path
  //   Shape B (client):   { text: string, mentions: ChatMentionRef[] }
  if (typeof parsed === 'object' && parsed !== null) {
    const obj = parsed as Record<string, unknown>
    if (Array.isArray(obj.mentions)) {
      return filterMentions(obj.mentions)
    }
    // Shape A — no mentions embedded, try the text field as raw JSON
    if (typeof obj.text === 'string') {
      parsed = obj.text
    } else {
      return []
    }
  }

  if (typeof parsed !== 'string') return []

  // Try to parse the string as JSON { text, mentions }
  let json: unknown
  try {
    json = JSON.parse(parsed)
  } catch {
    return [] // plain text legacy message
  }

  if (
    typeof json !== 'object' ||
    json === null ||
    !Array.isArray((json as Record<string, unknown>).mentions)
  ) {
    return []
  }

  return filterMentions((json as { mentions: unknown[] }).mentions)
}

function filterMentions(raw: unknown[]): ChatMentionRef[] {
  return raw.filter((m): m is ChatMentionRef => {
    if (typeof m !== 'object' || m === null) return false
    const ref = m as Record<string, unknown>
    return (
      typeof ref.entityId    === 'string'  &&
      typeof ref.entityType  === 'string'  &&
      typeof ref.displayText === 'string'  &&
      // USER mentions are Tier 1 — notification only, no backlink record
      ref.entityType !== 'USER'
    )
  })
}
