/**
 * Pages GraphQL Mappers — Prisma models → GraphQL shapes.
 *
 * PATTERN: Mirrors whiteboard/graphql/mappers.ts.
 * - `toGraphQLPage` returns `GraphQLPagePartial` (registered in codegen.ts mapper).
 * - `toGraphQLPageCollaborator` returns a fully typed collaborator shape.
 * - Field resolvers (Page.creator, Page.collaborators, Page.children) complete
 *   the type at resolution time via DataLoaders / tree builders.
 *
 * Prisma→GraphQL field renames handled here (single source of truth):
 *   parentPageId  → parentId
 *   emojiIcon     → icon
 *   coverImageUrl → coverUrl
 */

import type {
  Page as PrismaPage,
  PageCollaborator as PrismaPageCollaborator,
} from "@prisma/client";
import { PageRole } from "@/graphql/generated";
import type { PageWithChildren } from "../queries/get-project-pages/types";

// ─── Partial helper type (registered as codegen mapper for Page) ──────────────

/**
 * Intermediate type passed as `parent` to Page field resolvers.
 * `creator` and `collaborators` are optional — field resolvers populate them.
 * `children` is seeded by getProjectPages tree builder.
 *
 * Registered in codegen.ts as:
 *   Page: "../modules/pages/graphql/mappers#GraphQLPagePartial"
 */
export type GraphQLPagePartial = {
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
  createdAt: Date;
  updatedAt: Date;
  // Optional — populated by field resolvers:
  collaborators?: GraphQLPageCollaboratorShape[];
  creator?: GraphQLUserBasicShape;
  children?: GraphQLPagePartial[];
};

// ─── Collaborator / UserBasic shapes ─────────────────────────────────────────

export type GraphQLUserBasicShape = {
  id: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
};

export type GraphQLPageCollaboratorShape = {
  userId: string;
  role: PageRole;
  joinedAt: Date;
  user: GraphQLUserBasicShape;
};

// ─── Mappers ─────────────────────────────────────────────────────────────────

/**
 * Transform a Prisma Page record into GraphQLPagePartial.
 * Field resolvers handle `creator`, `collaborators`, and `children`.
 */
export const toGraphQLPage = (
  prisma: Partial<PrismaPage>
): GraphQLPagePartial => ({
  id: prisma.id!,
  workspaceId: prisma.workspaceId!,
  projectId: prisma.projectId!,
  parentId: prisma.parentPageId ?? null,
  title: prisma.title ?? "Untitled",
  icon: prisma.emojiIcon ?? null,
  coverUrl: prisma.coverImageUrl ?? null,
  position: prisma.position!,
  isArchived: prisma.isArchived!,
  isLocked: prisma.isLocked!,
  s3Key: prisma.s3Key ?? null,
  createdBy: prisma.createdBy!,
  createdAt: prisma.createdAt!,
  updatedAt: prisma.updatedAt!,
  // Stub — populated by field resolvers
  collaborators: [],
  creator: undefined,
  children: [],
});

/**
 * Recursively maps a PageWithChildren tree into GraphQLPagePartial.
 * Preserves the nested children[] built by buildTree so the GQL resolver
 * returns a proper hierarchy instead of a flat list with empty children.
 *
 * Use this in getProjectPages — NOT toGraphQLPage (which stubs children: []).
 */
export const toGraphQLPageTree = (
  page: PageWithChildren
): GraphQLPagePartial => ({
  ...toGraphQLPage(page),
  children: page.children.map(toGraphQLPageTree),
});

/**
 * Transform a Prisma PageCollaborator (with included user) into
 * GraphQLPageCollaboratorShape.
 *
 * `role` is cast from Prisma's `PageCollaboratorRole` enum to the generated
 * `PageRole` enum — values are identical (EDITOR / VIEWER / COMMENTER).
 */
export const toGraphQLPageCollaborator = (
  prisma: PrismaPageCollaborator & {
    user: {
      id: string;
      fullName: string | null;
      email: string;
      avatarUrl: string | null;
    };
  }
): GraphQLPageCollaboratorShape => ({
  userId: prisma.userId,
  role: prisma.role as unknown as PageRole,
  joinedAt: prisma.joinedAt,
  user: {
    id: prisma.user.id,
    fullName: prisma.user.fullName ?? "",
    email: prisma.user.email,
    avatarUrl: prisma.user.avatarUrl ?? null,
  },
});
