import { Resolvers } from "@/graphql/generated";
import { requireUser } from "@/shared/utils/graphql-helpers";
import * as queries from "../queries";
import * as services from "../services";
import { toGraphQLWhiteboard } from "./mappers";
import { CollaboratorWithUser } from "../loaders";

export const resolvers: Resolvers = {
  Query: {
    getBoard: async (_, args, ctx) => {
      await requireUser(ctx);
      const input = queries.getBoard.getBoardSchema.parse(args);
      const prismaBoard = await queries.getBoard.handler(input, ctx);
      return toGraphQLWhiteboard(prismaBoard);
    },
    userBoards: async (_, args, ctx) => {
      await requireUser(ctx);
      const input = queries.getUserBoards.getUserBoardsSchema.parse(args);
      const result = await queries.getUserBoards.handler(input, ctx);
      return {
        boards: result.boards.map(toGraphQLWhiteboard),
        nextCursor: result.nextCursor,
      };
    },
    boardCollaborators: async (_, args, ctx) => {
      await requireUser(ctx);
      const input =
        queries.getBoardCollaborators.getBoardCollaboratorsSchema.parse(args);
      return queries.getBoardCollaborators.handler(input, ctx);
    },
    workspaceBoards: async (_, args, ctx) => {
      await requireUser(ctx);
      const input =
        queries.getWorkspaceBoards.getWorkspaceBoardsSchema.parse(args);
      const result = await queries.getWorkspaceBoards.handler(input, ctx);
      return {
        boards: result.boards.map(toGraphQLWhiteboard),
        nextCursor: result.nextCursor,
      };
    },
    getBoardSnapshot: async (_, args, ctx) => {
      await requireUser(ctx);
      const input = queries.getBoardSnapshot.getBoardSnapshotSchema.parse(args);
      return queries.getBoardSnapshot.handler(input, ctx);
    },
    activeCollaborators: async (_, args, ctx) => {
      await requireUser(ctx);
      const input =
        queries.getActiveCollaborators.getActiveCollaboratorsSchema.parse(args);
      return queries.getActiveCollaborators.handler(input, ctx);
    },
  },
  Mutation: {
    createBoard: async (_, args, ctx) => {
      await requireUser(ctx);
      const input = services.createBoard.createBoardSchema.parse(args.input);
      const result = await services.createBoard.handler(input, ctx);
      return {
        board: toGraphQLWhiteboard(result.board),
        addedCollaborators: result.addedCollaborators.map((collab) => ({
          userId: collab.userId,
          joinedAt: collab.joinedAt,
          user: {
            id: collab.user.id,
            fullName: collab.user.fullName ?? "",
            email: collab.user.email ?? "",
            avatarUrl: collab.user.avatarUrl,
          },
        })),
      };
    },
    deleteBoard: async (_, args, ctx) => {
      await requireUser(ctx);
      const input = services.deleteBoard.deleteBoardSchema.parse(args);
      return services.deleteBoard.handler(input, ctx);
    },
    renameBoard: async (_, args, ctx) => {
      await requireUser(ctx);
      const input = services.renameBoard.renameBoardSchema.parse(args);
      const prismaBoard = await services.renameBoard.handler(input, ctx);
      return toGraphQLWhiteboard(prismaBoard);
    },
    updateBoardDescription: async (_, args, ctx) => {
      await requireUser(ctx);
      const input =
        services.updateBoardDescription.updateBoardDescriptionSchema.parse(
          args
        );
      const prismaBoard = await services.updateBoardDescription.handler(
        input,
        ctx
      );
      return toGraphQLWhiteboard(prismaBoard);
    },
    addBoardCollaborators: async (_, args, ctx) => {
      await requireUser(ctx);
      const input =
        services.addBoardCollaborators.addBoardCollaboratorsSchema.parse(args);
      return services.addBoardCollaborators.handler(input, ctx);
    },
    removeBoardCollaborator: async (_, args, ctx) => {
      await requireUser(ctx);
      const input =
        services.removeBoardCollaborator.removeBoardCollaboratorSchema.parse(
          args
        );
      return services.removeBoardCollaborator.handler(input, ctx);
    },
    archiveBoard: async (_, args, ctx) => {
      await requireUser(ctx);
      const input = services.archiveBoard.archiveBoardSchema.parse(args);
      const prismaBoard = await services.archiveBoard.handler(input, ctx);
      return toGraphQLWhiteboard(prismaBoard);
    },
    unarchiveBoard: async (_, args, ctx) => {
      await requireUser(ctx);
      const input = services.unarchiveBoard.unarchiveBoardSchema.parse(args);
      const prismaBoard = await services.unarchiveBoard.handler(input, ctx);
      return toGraphQLWhiteboard(prismaBoard);
    },
    lockBoard: async (_, args, ctx) => {
      await requireUser(ctx);
      const input = services.lockBoard.lockBoardSchema.parse(args);
      const prismaBoard = await services.lockBoard.handler(input, ctx);
      return toGraphQLWhiteboard(prismaBoard);
    },
    unlockBoard: async (_, args, ctx) => {
      await requireUser(ctx);
      const input = services.unlockBoard.unlockBoardSchema.parse(args);
      const prismaBoard = await services.unlockBoard.handler(input, ctx);
      return toGraphQLWhiteboard(prismaBoard);
    },
  },
  Whiteboard: {
    /**
     * Field resolver for collaborators
     * Uses DataLoader to batch requests efficiently
     */
    collaborators: async (parent, _args, ctx) => {
      // If handler already populated collaborators, return them
      if (parent.collaborators && parent.collaborators.length > 0) {
        return parent.collaborators;
      }

      // Use DataLoader for efficient batching
      const collaborators =
        await ctx.dataloaders.whiteboard.collaboratorsByBoardId.load(parent.id);

      // Map to GraphQL BoardCollaborator type
      return collaborators.map((collab: CollaboratorWithUser) => ({
        id: collab.id,
        userId: collab.userId,
        user: {
          id: collab.user.id,
          fullName: collab.user.fullName || "Unknown User",
          email: collab.user.email,
          avatarUrl: collab.user.avatarUrl,
        },
        joinedAt: collab.joinedAt,
      }));
    },

    /**
     * Field resolver for creator
     * Uses DataLoader to batch user lookups
     */
    creator: async (parent, _args, ctx) => {
      const user = await ctx.dataloaders.whiteboard.userById.load(
        parent.createdBy
      );

      if (!user) {
        throw new Error(`User not found: ${parent.createdBy}`);
      }

      return {
        id: user.id,
        fullName: user.fullName || "Unknown User",
        email: user.email,
        avatarUrl: user.avatarUrl,
      };
    },
  },
};
