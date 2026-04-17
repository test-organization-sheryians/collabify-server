/**
 * Mention — GraphQL Type Definitions Aggregator
 *
 * Collects all type definitions from queries and services.
 * Imported by module root index.ts and merged into the server schema.
 */

import * as getBacklinks from "../queries/get-backlinks";
import * as getMentions from "../queries/get-mentions";
import * as getMentionEvents from "../queries/get-mention-events";
import * as createMentions from "../services/create-mentions";
import * as updateMention from "../services/update-mention";
import * as deleteMentions from "../services/delete-mentions";
import * as deleteMentionsBySource from "../services/delete-mentions-by-source";
import * as orphanMentions from "../services/orphan-mentions";

export const mentionTypeDefs = [
  // ── Queries ──────────────────────────────────────────────────────────────────
  getBacklinks.typeDefs,
  getMentions.typeDefs,
  getMentionEvents.typeDefs,

  // ── Services (Mutations) ─────────────────────────────────────────────────────
  createMentions.typeDefs,
  updateMention.typeDefs,
  deleteMentions.typeDefs,
  deleteMentionsBySource.typeDefs,
  orphanMentions.typeDefs,
];
