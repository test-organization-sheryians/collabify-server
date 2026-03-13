// ── DB row types — re-exported from the step that owns them ──────────────────
// The select const lives in fetch-channel-members.ts, next to the query.
// ChannelMemberRow derives from it via Prisma.ChatMemberGetPayload so it
// can never drift from the actual select shape.
export type { ChannelMemberRow, GetChannelMembersResult } from "./steps/fetch-channel-members";
