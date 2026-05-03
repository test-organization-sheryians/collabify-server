/**
 * Mention — GraphQL Resolvers
 *
 * PATTERN (identical to pages, issues, chat):
 *   1. await requireUser(ctx)           — authentication gate
 *   2. schema.parse(args / args.input)  — Zod validation + type narrowing
 *   3. handler(input, ctx)              — delegate all logic to handler
 *   4. mapper(result)                   — internal → GraphQL type conversion
 *
 * No business logic here. Resolvers are pure glue.
 * All arg, parent, and ctx types are inferred from the generated `Resolvers` type.
 */

import { Resolvers } from "@/graphql/generated";
import { requireUser } from "@/shared/utils/graphql-helpers";
import { toGraphQLBacklinkResult, toGraphQLMention, toGraphQLMentionEvent, toGraphQLMentionResult } from "./mappers";
import * as queries from "../queries";
import * as services from "../services";

export const resolvers: Resolvers = {
  // ── Queries ──────────────────────────────────────────────────────────────────

  Query: {
    getBacklinks: async (_, args, ctx) => {
      await requireUser(ctx);
      const input = queries.getBacklinks.schema.parse(args);
      const result = await queries.getBacklinks.handler(input, ctx);
      return toGraphQLBacklinkResult(result);
    },

    getMentions: async (_, args, ctx) => {
      await requireUser(ctx);
      const input = queries.getMentions.schema.parse(args);
      const result = await queries.getMentions.handler(input, ctx);
      return result.map(toGraphQLMention);
    },

    getMentionEvents: async (_, args, ctx) => {
      await requireUser(ctx);
      const input = queries.getMentionEvents.schema.parse(args);
      const result = await queries.getMentionEvents.handler(input, ctx);
      return result.map(toGraphQLMentionEvent);
    },

    getMentionsBySourceIds: async (
      _,
      args,
      ctx
    ) => {
      await requireUser(ctx);
      const input = queries.getMentionsBySourceIds.GetMentionsBySourceIdsSchema.parse(args);
      const result = await queries.getMentionsBySourceIds.handler(input, ctx);
      return result.map(toGraphQLMentionResult);
    },
  },

  // ── Mutations ────────────────────────────────────────────────────────────────

  Mutation: {
    createMentions: async (_, args, ctx) => {
      await requireUser(ctx);
      const input = services.createMentions.schema.parse(args);
      const result = await services.createMentions.handler(input, ctx);
      return result.mentions.map(toGraphQLMention);
    },

    updateMention: async (_, args, ctx) => {
      await requireUser(ctx);
      const input = services.updateMention.schema.parse(args.input);
      const result = await services.updateMention.handler(input, ctx);
      return toGraphQLMention(result.mention);
    },

    deleteMentions: async (_, args, ctx) => {
      await requireUser(ctx);
      const input = services.deleteMentions.schema.parse(args);
      const result = await services.deleteMentions.handler(input, ctx);
      return result.success;
    },

    deleteMentionsBySource: async (_, args, ctx) => {
      await requireUser(ctx);
      const input = services.deleteMentionsBySource.schema.parse(args);
      const result = await services.deleteMentionsBySource.handler(input, ctx);
      return result.count;
    },

    orphanMentions: async (_, args, ctx) => {
      await requireUser(ctx);
      const input = services.orphanMentions.schema.parse(args);
      const result = await services.orphanMentions.handler(input, ctx);
      return result.count;
    },
  },
};
