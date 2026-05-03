/**
 * Vault — GraphQL Resolvers
 *
 * PATTERN (identical to pages and issues):
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
import { toGraphQLFolder, toGraphQLFile, toGraphQLUsage } from "./mappers";
import * as queries from "../queries";
import * as services from "../services";
import { getBatchDownloadUrlsHandler } from "../queries/get-batch-download-urls/handler";
import { getBatchDownloadUrlsSchema } from "../queries/get-batch-download-urls/schema";
import { registerExternalFileHandler } from "../services/register-external-file/handler";
import { registerExternalFileSchema } from "../services/register-external-file/schema";
import { markFilesUnreferencedHandler } from "../services/mark-unreferenced/handler";
import { markFilesUnreferencedSchema } from "../services/mark-unreferenced/schema";

export const resolvers: Resolvers = {
  // ── Queries ────────────────────────────────────────────────────────────────

  Query: {
    getVaultChildren: async (_, args, ctx) => {
      await requireUser(ctx);
      const input = queries.getVaultChildren.schema.parse(args);
      const result = await queries.getVaultChildren.handler(input, ctx);
      return {
        ...result,
        folders: result.folders.map(toGraphQLFolder),
        files: result.files.map(toGraphQLFile),
      };
    },

    getVaultNode: async (_, args, ctx) => {
      await requireUser(ctx);
      const input = queries.getVaultNode.schema.parse(args);
      const result = await queries.getVaultNode.handler(input, ctx);
      if ("childFolderCount" in result) {
        return {
          __typename: "VaultFolder" as const,
          ...toGraphQLFolder(result),
        };
      }
      return {
        __typename: "VaultFile" as const,
        ...toGraphQLFile(result),
      };
    },

    getVaultSidebar: async (_, args, ctx) => {
      await requireUser(ctx);
      const input = queries.getVaultSidebar.schema.parse(args);
      const result = await queries.getVaultSidebar.handler(input, ctx);
      return {
        pinnedFolders: result.pinnedFolders.map(toGraphQLFolder),
        systemFolders: result.systemFolders.map(toGraphQLFolder),
      };
    },

    getVaultDownloadUrl: async (_, args, ctx) => {
      await requireUser(ctx);
      const input = queries.getVaultDownloadUrl.schema.parse(args);
      return queries.getVaultDownloadUrl.handler(input, ctx);
    },

    getVaultUsage: async (_, args, ctx) => {
      await requireUser(ctx);
      const input = queries.getVaultUsage.schema.parse(args);
      const result = await queries.getVaultUsage.handler(input, ctx);
      return toGraphQLUsage(result);
    },

    getVaultAncestors: async (_, args, ctx) => {
      await requireUser(ctx);
      const input = queries.getVaultAncestors.schema.parse(args);
      const result = await queries.getVaultAncestors.handler(input, ctx);
      return result.map(toGraphQLFolder);
    },

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getBatchDownloadUrls: async (_: unknown, args: any, ctx: any) => {
      await requireUser(ctx);
      const input = getBatchDownloadUrlsSchema.parse(args);
      return getBatchDownloadUrlsHandler(input, ctx);
    },
  },

  // ── Mutations ──────────────────────────────────────────────────────────────

  Mutation: {
    // ── Upload Flow ────────────────────────────────────────────────────────

    requestVaultUpload: async (_, args, ctx) => {
      await requireUser(ctx);
      const input = services.requestVaultUpload.schema.parse(args.input);
      return services.requestVaultUpload.handler(input, ctx);
    },

    confirmVaultUpload: async (_, args, ctx) => {
      await requireUser(ctx);
      const input = services.confirmVaultUpload.schema.parse(args.input);
      const result = await services.confirmVaultUpload.handler(input, ctx);
      return { file: toGraphQLFile(result.file) };
    },

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    registerExternalFile: async (_: unknown, args: any, ctx: any) => {
      await requireUser(ctx);
      const input = registerExternalFileSchema.parse(args.input);
      return registerExternalFileHandler(input, ctx);
    },

    // ── Folder Operations ──────────────────────────────────────────────────

    createVaultFolder: async (_, args, ctx) => {
      await requireUser(ctx);
      const input = services.createVaultFolder.schema.parse(args.input);
      const result = await services.createVaultFolder.handler(input, ctx);
      return { folder: toGraphQLFolder(result.folder) };
    },

    renameVaultFolder: async (_, args, ctx) => {
      await requireUser(ctx);
      const input = services.renameVaultFolder.schema.parse(args.input);
      const result = await services.renameVaultFolder.handler(input, ctx);
      return { folder: toGraphQLFolder(result.folder) };
    },

    deleteVaultFolder: async (_, args, ctx) => {
      await requireUser(ctx);
      const input = services.deleteVaultFolder.schema.parse(args.input);
      return services.deleteVaultFolder.handler(input, ctx);
    },

    moveVaultFolder: async (_, args, ctx) => {
      await requireUser(ctx);
      const input = services.moveVaultFolder.schema.parse(args.input);
      const result = await services.moveVaultFolder.handler(input, ctx);
      return { folder: toGraphQLFolder(result.folder) };
    },

    pinVaultFolder: async (_, args, ctx) => {
      await requireUser(ctx);
      const input = services.pinVaultFolder.schema.parse(args.input);
      const result = await services.pinVaultFolder.handler(input, ctx);
      return { folder: toGraphQLFolder(result.folder) };
    },

    unpinVaultFolder: async (_, args, ctx) => {
      await requireUser(ctx);
      const input = services.unpinVaultFolder.schema.parse(args.input);
      return services.unpinVaultFolder.handler(input, ctx);
    },

    // ── File Operations ────────────────────────────────────────────────────

    moveVaultFile: async (_, args, ctx) => {
      await requireUser(ctx);
      const input = services.moveVaultFile.schema.parse(args.input);
      const result = await services.moveVaultFile.handler(input, ctx);
      return { file: toGraphQLFile(result.file) };
    },

    renameVaultFile: async (_, args, ctx) => {
      await requireUser(ctx);
      const input = services.renameVaultFile.schema.parse(args.input);
      const result = await services.renameVaultFile.handler(input, ctx);
      return { file: toGraphQLFile(result.file) };
    },

    deleteVaultFile: async (_, args, ctx) => {
      await requireUser(ctx);
      const input = services.deleteVaultFile.schema.parse(args.input);
      return services.deleteVaultFile.handler(input, ctx);
    },

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    markFilesUnreferenced: async (_: unknown, args: any, ctx: any) => {
      await requireUser(ctx);
      const input = markFilesUnreferencedSchema.parse(args.input);
      return markFilesUnreferencedHandler(input, ctx);
    },
  },

  // ── Union Resolver ─────────────────────────────────────────────────────────

  VaultNode: {
    __resolveType(obj) {
      if ("parentFolderId" in obj) return "VaultFolder";
      return "VaultFile";
    },
  },
};
