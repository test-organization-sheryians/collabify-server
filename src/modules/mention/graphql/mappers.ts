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
