// ── DB row types — re-exported from the step that owns them ──────────────────
// The select const lives in fetch-messages.ts, next to the query that uses it.
// MessageRow derives from it via Prisma.ChatMessageGetPayload so it
// can never drift from the actual select shape.
export type { MessageRow } from "./steps/fetch-messages";
