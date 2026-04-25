/**
 * Mention — GraphQL Mappers
 *
 * Internal types → GraphQL type converters.
 * No business logic — pure shape transformation.
 *
 * Mappers are registered in codegen.ts so the generated `Resolvers` type
 * accepts what these functions return directly.
 */

import type { MentionRecord } from "../types/mention-record";
import type { BacklinkWithMention } from "../types/backlink-record";
import type { MentionEventRecord } from "../types/mention-event-record";
import type { BacklinkResult } from "../types/backlink-record";
import type { MentionResult } from "../queries/get-mentions-by-source-ids";

// ── Mention ────────────────────────────────────────────────────────────────────

export type GraphQLMention = ReturnType<typeof toGraphQLMention>;

export function toGraphQLMention(mention: MentionRecord) {
  return {
    id: mention.id,
    sourceEntityId: mention.sourceEntityId,
    sourceEntityType: mention.sourceEntityType,
    targetEntityId: mention.targetEntityId,
    targetEntityType: mention.targetEntityType,
    displayText: mention.displayText,
    sourceLocation: mention.sourceLocation,
    tier: mention.tier,
    status: mention.status,
    createdAt: mention.createdAt,
    createdById: mention.createdById,
  };
}

// ── SourceMention (for getMentionsBySourceIds) ─────────────────────────────────

export function toGraphQLSourceMention(mention: { entityId: string; entityType: string; displayText: string }) {
  return {
    id: "", // Not available in this context
    targetEntityId: mention.entityId,
    targetEntityType: mention.entityType,
    displayText: mention.displayText,
    sourceEntityId: "", // Not available in this context
    sourceEntityType: "", // Not available in this context
    sourceLocation: null,
    tier: "TIER_2",
    status: "ACTIVE",
    createdAt: new Date(),
    createdById: "",
  };
}

// ── MentionResult (batch fetch) ────────────────────────────────────────────────

export function toGraphQLMentionResult(result: MentionResult) {
  return {
    sourceId: result.sourceId,
    mentions: result.mentions.map((m) => ({
      id: "", // Not available in this context
      targetEntityId: m.entityId,
      targetEntityType: m.entityType,
      displayText: m.displayText,
      sourceEntityId: result.sourceId,
      sourceEntityType: "CHAT_MESSAGE",
      sourceLocation: null,
      tier: "TIER_2",
      status: "ACTIVE",
      createdAt: new Date(),
      createdById: "",
    })),
  };
}

// ── MentionEvent ────────────────────────────────────────────────────────────────

export type GraphQLMentionEvent = ReturnType<typeof toGraphQLMentionEvent>;

export function toGraphQLMentionEvent(event: MentionEventRecord) {
  return {
    id: event.id,
    mentionId: event.mentionId,
    eventType: event.eventType,
    payload: event.payload,
    actorId: event.actorId,
    createdAt: event.createdAt,
  };
}

// ── Backlink ───────────────────────────────────────────────────────────────────

export type GraphQLBacklink = ReturnType<typeof toGraphQLBacklink>;

export function toGraphQLBacklink(backlink: BacklinkWithMention) {
  return {
    id: backlink.id,
    sourceEntityId: backlink.sourceEntityId,
    sourceEntityType: backlink.sourceEntityType,
    targetEntityId: backlink.targetEntityId,
    targetEntityType: backlink.targetEntityType,
    context: backlink.context,
    createdAt: backlink.createdAt,
    sourceMention: toGraphQLMention(backlink.sourceMention),
  };
}

// ── BacklinkResult ─────────────────────────────────────────────────────────────

export type GraphQLBacklinkResult = {
  backlinks: GraphQLBacklink[];
  total: number;
  hasMore: boolean;
};

export function toGraphQLBacklinkResult(result: BacklinkResult): GraphQLBacklinkResult {
  return {
    backlinks: result.backlinks.map(toGraphQLBacklink),
    total: result.total,
    hasMore: result.hasMore,
  };
}
