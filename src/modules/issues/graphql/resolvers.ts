/**
 * Issues — GraphQL Resolvers
 *
 * PATTERN (identical to pages and chat):
 *   1. await requireUser(ctx)           — authentication gate
 *   2. schema.parse(args / args.input)  — Zod validation + type narrowing
 *   3. handler(input, ctx)              — delegate all logic to handler
 *   4. mapper(result)                   — Prisma → GraphQL type conversion
 *
 * No business logic here. Resolvers are pure glue.
 * All arg, parent, and ctx types are inferred from the generated `Resolvers` type.
 */

import { Resolvers } from "@/graphql/generated";
import { requireUser } from "@/shared/utils/graphql-helpers";
import { toGraphQLIssue, toGraphQLStatus, toGraphQLLabel } from "./mappers";
import * as queries from "../queries";
import * as services from "../services";

export const resolvers: Resolvers = {
  // ── Queries ────────────────────────────────────────────────────────────────

  Query: {
    getIssueStatuses: async (_, args, ctx) => {
      await requireUser(ctx);
      const input = queries.getIssueStatuses.schema.parse(args);
      const result = await queries.getIssueStatuses.handler(input, ctx);
      return result.map(toGraphQLStatus);
    },

    getProjectIssues: async (_, args, ctx) => {
      await requireUser(ctx);
      const input = queries.getProjectIssues.schema.parse(args);
      const result = await queries.getProjectIssues.handler(input, ctx);
      return result.map(toGraphQLIssue);
    },

    getIssue: async (_, args, ctx) => {
      await requireUser(ctx);
      const input = queries.getIssue.schema.parse(args);
      const result = await queries.getIssue.handler(input, ctx);
      return toGraphQLIssue(result);
    },

    getIssueLabels: async (_, args, ctx) => {
      await requireUser(ctx);
      const input = queries.getIssueLabels.schema.parse(args);
      const result = await queries.getIssueLabels.handler(input, ctx);
      return result.map(toGraphQLLabel);
    },

    getIssueDescriptionUrl: async (_, args, ctx) => {
      await requireUser(ctx);
      const input = queries.getIssueDescriptionUrl.schema.parse(args);
      return queries.getIssueDescriptionUrl.handler(input, ctx);
    },
  },

  // ── Mutations ──────────────────────────────────────────────────────────────

  Mutation: {
    // ── Issue CRUD ────────────────────────────────────────────────────────

    createIssue: async (_, args, ctx) => {
      await requireUser(ctx);
      const input = services.createIssue.schema.parse(args.input);
      const result = await services.createIssue.handler(input, ctx);
      return { issue: toGraphQLIssue(result.issue) };
    },

    updateIssue: async (_, args, ctx) => {
      await requireUser(ctx);
      const rawInput = args.input as Record<string, unknown>;
      const normalized = {
        ...rawInput,
        dueDate:
          rawInput.dueDate instanceof Date
            ? (rawInput.dueDate as Date).toISOString()
            : rawInput.dueDate,
      };
      const input = services.updateIssue.schema.parse(normalized);
      const result = await services.updateIssue.handler(input, ctx);
      return { issue: toGraphQLIssue(result.issue) };
    },

    deleteIssue: async (_, args, ctx) => {
      await requireUser(ctx);
      const input = services.deleteIssue.schema.parse(args.input);
      return services.deleteIssue.handler(input, ctx);
    },

    // ── Drag & Drop ───────────────────────────────────────────────────────

    moveIssueStatus: async (_, args, ctx) => {
      await requireUser(ctx);
      const input = services.moveIssueStatus.schema.parse(args.input);
      const result = await services.moveIssueStatus.handler(input, ctx);
      return { issue: toGraphQLIssue(result.issue) };
    },

    reorderIssue: async (_, args, ctx) => {
      await requireUser(ctx);
      const input = services.reorderIssue.schema.parse(args.input);
      const result = await services.reorderIssue.handler(input, ctx);
      return { issue: toGraphQLIssue(result.issue) };
    },

    // ── Status (Column) Management ────────────────────────────────────────

    createIssueStatus: async (_, args, ctx) => {
      await requireUser(ctx);
      const input = services.createIssueStatus.schema.parse(args.input);
      const result = await services.createIssueStatus.handler(input, ctx);
      return { status: toGraphQLStatus(result.status) };
    },

    updateIssueStatus: async (_, args, ctx) => {
      await requireUser(ctx);
      const input = services.updateIssueStatus.schema.parse(args.input);
      const result = await services.updateIssueStatus.handler(input, ctx);
      return { status: toGraphQLStatus(result.status) };
    },

    reorderIssueStatus: async (_, args, ctx) => {
      await requireUser(ctx);
      const input = services.reorderIssueStatus.schema.parse(args.input);
      const result = await services.reorderIssueStatus.handler(input, ctx);
      return { status: toGraphQLStatus(result.status) };
    },

    deleteIssueStatus: async (_, args, ctx) => {
      await requireUser(ctx);
      const input = services.deleteIssueStatus.schema.parse(args.input);
      return services.deleteIssueStatus.handler(input, ctx);
    },

    // ── Label Management ──────────────────────────────────────────────────

    createIssueLabel: async (_, args, ctx) => {
      await requireUser(ctx);
      const input = services.createIssueLabel.schema.parse(args.input);
      const result = await services.createIssueLabel.handler(input, ctx);
      return { label: toGraphQLLabel(result.label) };
    },

    updateIssueLabel: async (_, args, ctx) => {
      await requireUser(ctx);
      const input = services.updateIssueLabel.schema.parse(args.input);
      const result = await services.updateIssueLabel.handler(input, ctx);
      return { label: toGraphQLLabel(result.label) };
    },

    deleteIssueLabel: async (_, args, ctx) => {
      await requireUser(ctx);
      const input = services.deleteIssueLabel.schema.parse(args.input);
      return services.deleteIssueLabel.handler(input, ctx);
    },

    // ── Description S3 Upload ─────────────────────────────────────────────

    requestIssueDescriptionUpload: async (_, args, ctx) => {
      await requireUser(ctx);
      const input = services.requestDescriptionUpload.schema.parse(args.input);
      return services.requestDescriptionUpload.handler(input, ctx);
    },

    confirmIssueDescriptionUpload: async (_, args, ctx) => {
      await requireUser(ctx);
      const input = services.confirmDescriptionUpload.schema.parse(args.input);
      const result = await services.confirmDescriptionUpload.handler(
        input,
        ctx
      );
      return { issue: toGraphQLIssue(result.issue) };
    },
  },
};
