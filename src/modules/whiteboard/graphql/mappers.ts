import { Whiteboard } from "@/graphql/generated";
import { Whiteboard as PrismaWhiteboard } from "@prisma/client";

/**
 * Whiteboard Mappers
 *
 * Transform Prisma database types to GraphQL schema types.
 * Field resolvers will handle nested object population (creator, collaborators).
 */

/**
 * Intermediate type for Whiteboard that field resolvers will complete.
 * - All direct fields are included
 * - creator and collaborators are optional (field resolvers populate these)
 * - createdBy is preserved for field resolver use
 */
export type GraphQLWhiteboardPartial = Omit<
  Whiteboard,
  "creator" | "collaborators"
> & {
  creator?: Whiteboard["creator"];
  collaborators?: Whiteboard["collaborators"];
  createdBy: string; // Keep for field resolver
};

/**
 * Maps a Prisma Whiteboard to a GraphQL Whiteboard (partial).
 * Field resolvers will populate:
 * - creator (from createdBy via DataLoader)
 * - collaborators (from whiteboardId via DataLoader)
 *
 * Accepts Partial<> because Prisma queries may return subset of fields.
 * Returns 'as any' to satisfy GraphQL resolver types - field resolvers complete the type.
 */
export const toGraphQLWhiteboard = (prisma: Partial<PrismaWhiteboard>): any => {
  return {
    id: prisma.id!,
    title: prisma.title!,
    description: prisma.description ?? null,
    projectId: prisma.projectId ?? null,
    workspaceId: prisma.workspaceId!,
    elementCount: prisma.elementCount ?? 0,
    fileSizeBytes: prisma.fileSizeBytes?.toString() ?? "0", // BigInt → String
    isLocked: prisma.isLocked!,
    isArchived: prisma.isArchived!,
    createdAt: prisma.createdAt!,
    updatedAt: prisma.updatedAt!,
    createdBy: prisma.createdBy!, // Kept for field resolver
  } as GraphQLWhiteboardPartial;
};

/**
 * Maps array of Prisma Whiteboards to GraphQL Whiteboards
 */
export const toGraphQLWhiteboards = (
  prismaBoards: Partial<PrismaWhiteboard>[]
): any[] => {
  return prismaBoards.map(toGraphQLWhiteboard);
};
