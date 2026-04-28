/**
 * Pages GraphQL Resolvers — thin orchestration layer.
 *
 * PATTERN (identical to chat and whiteboard):
 *   1. await requireUser(ctx)           — authentication gate
 *   2. schema.parse(args / args.input)  — Zod validation + type narrowing
 *   3. handler(input, ctx)              — delegate all logic to handler
 *
 * No business logic here. Resolvers are pure glue.
 * All arg, parent, and ctx types are inferred from the generated `Resolvers` type.
 */

import { Resolvers } from "@/graphql/generated";
import type { ServiceContext } from "@/graphql/types";
import { requireUser } from "@/shared/utils/graphql-helpers";
import {
  toGraphQLPage,
  toGraphQLPageTree,
  toGraphQLPageCollaborator,
  toGraphQLPagePreview,
} from "./mappers";
import * as queries from "../queries";
import * as services from "../services";

export const resolvers: Resolvers = {
  // ── Queries ──────────────────────────────────────────────────────────────────

  Query: {
    getPage: async (_, args, ctx) => {
      await requireUser(ctx);
      const input = queries.getPage.schema.parse(args);
      const page = await queries.getPage.handler(input, ctx);
      return toGraphQLPage(page);
    },

    getPageSnapshot: async (_, args, ctx) => {
      await requireUser(ctx);
      const input = queries.getPageSnapshot.schema.parse(args);
      return queries.getPageSnapshot.handler(input, ctx);
    },

    getProjectPages: async (_, args, ctx) => {
      await requireUser(ctx);
      const input = queries.getProjectPages.schema.parse(args);
      const roots = await queries.getProjectPages.handler(input, ctx);
      return roots.map(toGraphQLPageTree);
    },

    getPageCollaborators: async (_, args, ctx) => {
      await requireUser(ctx);
      const input = queries.getPageCollaborators.schema.parse(args);
      const { collaborators } = await queries.getPageCollaborators.handler(
        input,
        ctx
      );
      return collaborators.map(toGraphQLPageCollaborator);
    },

    getActivePageCollaborators: async (_, args, ctx) => {
      await requireUser(ctx);
      const input = queries.getActivePageCollaborators.schema.parse(args);
      const result = await queries.getActivePageCollaborators.handler(
        input,
        ctx
      );
      return result as any;
    },

    getPagesHome: async (
      _: unknown,
      args: { limit?: number },
      ctx: ServiceContext
    ) => {
      await requireUser(ctx);
      const input = queries.getPagesHome.schema.parse({
        limit: args.limit ?? 10,
      });
      return queries.getPagesHome.handler(input, ctx);
    },
  },

  // ── Mutations ────────────────────────────────────────────────────────────────

  Mutation: {
    createPage: async (_, args, ctx) => {
      await requireUser(ctx);
      const input = services.createPage.schema.parse(args.input);
      const result = await services.createPage.handler(input, ctx);
      return { page: toGraphQLPage(result.page) };
    },

    deletePage: async (_, args, ctx) => {
      await requireUser(ctx);
      const input = services.deletePage.schema.parse(args.input);
      return services.deletePage.handler(input, ctx);
    },

    renamePage: async (_, args, ctx) => {
      await requireUser(ctx);
      const input = services.renamePage.schema.parse(args.input);
      const result = await services.renamePage.handler(input, ctx);
      return { page: toGraphQLPage(result.page) };
    },

    archivePage: async (_, args, ctx) => {
      await requireUser(ctx);
      const input = services.archivePage.schema.parse(args.input);
      const result = await services.archivePage.handler(input, ctx);
      return { page: toGraphQLPage(result.page) };
    },

    unarchivePage: async (_, args, ctx) => {
      await requireUser(ctx);
      const input = services.unarchivePage.schema.parse(args.input);
      const result = await services.unarchivePage.handler(input, ctx);
      return { page: toGraphQLPage(result!.page) };
    },

    lockPage: async (_, args, ctx) => {
      await requireUser(ctx);
      const input = services.lockPage.schema.parse(args.input);
      const result = await services.lockPage.handler(input, ctx);
      return { page: toGraphQLPage(result.page) };
    },

    unlockPage: async (_, args, ctx) => {
      await requireUser(ctx);
      const input = services.unlockPage.schema.parse(args.input);
      const result = await services.unlockPage.handler(input, ctx);
      return { page: toGraphQLPage(result.page) };
    },

    reorderPage: async (_, args, ctx) => {
      await requireUser(ctx);
      const input = services.reorderPage.schema.parse(args.input);
      const result = await services.reorderPage.handler(input, ctx);
      return { page: toGraphQLPage(result.page) };
    },

    addPageCollaborators: async (_, args, ctx) => {
      await requireUser(ctx);
      const input = services.addPageCollaborators.schema.parse(args.input);
      const result = await services.addPageCollaborators.handler(input, ctx);
      return {
        addedCollaborators: result.addedCollaborators.map(
          toGraphQLPageCollaborator
        ),
      };
    },

    removePageCollaborator: async (_, args, ctx) => {
      await requireUser(ctx);
      const input = services.removePageCollaborator.schema.parse(args.input);
      return services.removePageCollaborator.handler(input, ctx);
    },

    updatePageDetails: async (_, args, ctx) => {
      await requireUser(ctx);
      const input = services.updatePageDetails.schema.parse(args.input);
      const result = await services.updatePageDetails.handler(input, ctx);
      return { page: toGraphQLPage(result.page) };
    },
  },

  // ── Field Resolvers ───────────────────────────────────────────────────────────

  Page: {
    /**
     * Short-circuit if parent already has collaborators (e.g. from createPage).
     * TODO: Wire ctx.dataloaders.page.collaboratorsByPageId once DataLoaders are finalised.
     */
    collaborators: async (parent, _args, _ctx) => {
      if (parent.collaborators?.length) return parent.collaborators;
      // TODO: return ctx.dataloaders.page.collaboratorsByPageId.load(parent.id);
      return [];
    },

    /**
     * TODO: Wire ctx.dataloaders.page.userById once DataLoaders are finalised.
     */
    creator: async (parent, _args, _ctx) => {
      if (parent.creator?.id) return parent.creator;
      // TODO: return ctx.dataloaders.page.userById.load(parent.createdBy);
      return { id: parent.createdBy, fullName: "", email: "", avatarUrl: null };
    },

    /**
     * Populated by the getProjectPages tree builder. Empty in all other contexts.
     */
    children: (parent) => parent.children ?? [],
  },
};
