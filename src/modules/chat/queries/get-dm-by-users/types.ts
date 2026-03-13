// ── DB row types — re-exported from the step that owns them ──────────────────
// The select const lives in fetch-dm.ts, next to the query that uses it.
// DmRow/DmMemberRow derive from it via Prisma.ChatConversationGetPayload so
// they can never drift from the actual select shape.
export type { DmRow, DmMemberRow } from "./steps/fetch-dm";
