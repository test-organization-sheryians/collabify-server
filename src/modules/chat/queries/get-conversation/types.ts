import type { Conversation } from "@/graphql/generated";

// ── Output type ──────────────────────────────────────────────────────────────
export type GetConversationOutput = Conversation;

// ── DB row types — re-exported from the steps that own them ──────────────────
// Each select const lives in its step file, next to the query that uses it.
// The types derive from those consts via Prisma.XGetPayload, so they
// can never drift from the actual select shape.
export type { ConversationRow, MemberRow, MemberUserRow } from "./steps/fetch-conversation";
export type { LastMessageRow } from "./steps/fetch-last-message";
