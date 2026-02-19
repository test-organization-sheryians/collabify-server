/**
 * Pages GraphQL Mappers — Prisma models → GraphQL shapes.
 *
 * RULES:
 * - Pure functions only (no I/O, no async).
 * - Called by resolvers AFTER handler returns data.
 * - All optional/nullable fields handled safely here so resolvers stay clean.
 */

// ─── Types (inline until codegen is wired up) ────────────────────────────────

// TODO: Replace these inline types with generated types from @/graphql/generated
// once `npx graphql-codegen` is run after type-defs.ts is finalised.

export interface GraphQLUserBasic {
  id: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
}

export interface GraphQLPageCollaborator {
  userId: string;
  role: "EDITOR" | "VIEWER" | "COMMENTER";
  joinedAt: string; // ISO datetime
  user: GraphQLUserBasic;
}

export interface GraphQLPage {
  id: string;
  workspaceId: string;
  projectId: string;
  parentId: string | null;
  title: string;
  icon: string | null;
  coverUrl: string | null;
  position: number;
  isArchived: boolean;
  isLocked: boolean;
  s3Key: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  // Populated by field resolvers via DataLoader:
  collaborators: GraphQLPageCollaborator[];
  creator: GraphQLUserBasic;
  // Populated by getProjectPages tree builder:
  children: GraphQLPage[];
}

// ─── Mappers ─────────────────────────────────────────────────────────────────

/**
 * Transform a Prisma Page record into the GraphQL Page shape.
 *
 * NOTE: collaborators, creator, and children are set to empty arrays/stub.
 * Their actual values are populated by:
 * - Page.collaborators → DataLoader (collaboratorsByPageId)
 * - Page.creator       → DataLoader (userById)
 * - Page.children      → in-memory tree builder in getProjectPages handler
 *
 * TODO: Implement — map each field from Prisma to GraphQL.
 * Null safety: prismaPage.title ?? 'Untitled'
 * Date conversion: createdAt.toISOString(), updatedAt.toISOString()
 */
export function toGraphQLPage(prismaPage: any): GraphQLPage {
  // TODO: return {
  //   id: prismaPage.id,
  //   workspaceId: prismaPage.workspaceId,
  //   projectId: prismaPage.projectId,
  //   parentId: prismaPage.parentId ?? null,
  //   title: prismaPage.title ?? 'Untitled',
  //   icon: prismaPage.icon ?? null,
  //   coverUrl: prismaPage.coverUrl ?? null,
  //   position: prismaPage.position,
  //   isArchived: prismaPage.isArchived,
  //   isLocked: prismaPage.isLocked,
  //   s3Key: prismaPage.s3Key ?? null,
  //   createdBy: prismaPage.createdBy,
  //   createdAt: prismaPage.createdAt.toISOString(),
  //   updatedAt: prismaPage.updatedAt.toISOString(),
  //   collaborators: [],   // populated by DataLoader field resolver
  //   creator: { id: '', fullName: '', email: '', avatarUrl: null }, // populated by DataLoader
  //   children: [],        // populated by getProjectPages tree builder
  // }
  throw new Error("toGraphQLPage: not implemented");
}

/**
 * Transform a Prisma PageCollaborator (with included user) into GraphQL shape.
 *
 * TODO: Implement — map userId, role, joinedAt.toISOString(), user: toGraphQLUserBasic(prisma.user)
 */
export function toGraphQLPageCollaborator(
  prismaCollaborator: any
): GraphQLPageCollaborator {
  // TODO: return {
  //   userId: prismaCollaborator.userId,
  //   role: prismaCollaborator.role,
  //   joinedAt: prismaCollaborator.joinedAt.toISOString(),
  //   user: toGraphQLUserBasic(prismaCollaborator.user),
  // }
  throw new Error("toGraphQLPageCollaborator: not implemented");
}

/**
 * Transform a Prisma User record into the GraphQL UserBasic shape.
 *
 * TODO: Implement
 * Null safety: user.fullName ?? 'Unknown User', user.avatarUrl ?? null
 */
export function toGraphQLUserBasic(prismaUser: any): GraphQLUserBasic {
  // TODO: return {
  //   id: prismaUser.id,
  //   fullName: prismaUser.fullName ?? 'Unknown User',
  //   email: prismaUser.email,
  //   avatarUrl: prismaUser.avatarUrl ?? null,
  // }
  throw new Error("toGraphQLUserBasic: not implemented");
}
