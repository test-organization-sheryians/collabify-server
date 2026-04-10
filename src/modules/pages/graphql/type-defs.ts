/**
 * Pages GraphQL Type Definitions — SDL aggregator.
 *
 * This file aggregates:
 * 1. Shared types (Page, PageCollaborator, PageRole, GetPageSnapshotResult)
 * 2. Per-service type extensions (extend type Mutation { ... })
 * 3. Per-query type extensions (extend type Query { ... })
 *
 * IMPORTANT: After adding new typeDefs here, run:
 *   npx graphql-codegen
 * to regenerate server/src/graphql/generated.ts (typed Resolvers interface).
 */

// ─── Services (Mutations) ────────────────────────────────────────────────────

import { typeDefs as createPageTypeDefs } from "../services/create-page/type-defs";
import { typeDefs as deletePageTypeDefs } from "../services/delete-page/type-defs";
import { typeDefs as renamePageTypeDefs } from "../services/rename-page/type-defs";
import { typeDefs as archivePageTypeDefs } from "../services/archive-page/type-defs";
import { typeDefs as unarchivePageTypeDefs } from "../services/unarchive-page/type-defs";
import { typeDefs as lockPageTypeDefs } from "../services/lock-page/type-defs";
import { typeDefs as unlockPageTypeDefs } from "../services/unlock-page/type-defs";
import { typeDefs as reorderPageTypeDefs } from "../services/reorder-page/type-defs";
import { typeDefs as addPageCollaboratorsTypeDefs } from "../services/add-page-collaborators/type-defs";
import { typeDefs as removePageCollaboratorTypeDefs } from "../services/remove-page-collaborator/type-defs";
import { typeDefs as updatePageDetailsTypeDefs } from "../services/update-page-details/type-defs";

// ─── Queries ─────────────────────────────────────────────────────────────────

import { typeDefs as getPageTypeDefs } from "../queries/get-page/type-defs";
import { typeDefs as getPageSnapshotTypeDefs } from "../queries/get-page-snapshot/type-defs";
import { typeDefs as getProjectPagesTypeDefs } from "../queries/get-project-pages/type-defs";
import { typeDefs as getPageCollaboratorsTypeDefs } from "../queries/get-page-collaborators/type-defs";
import { typeDefs as getActivePageCollaboratorsTypeDefs } from "../queries/get-active-page-collaborators/type-defs";

// ─── Shared Base Types ───────────────────────────────────────────────────────

const sharedTypeDefs = /* GraphQL */ `
  """
  A collaborative document page within a project.
  The Y.Doc content is synced via WebSocket and accessed via getPageSnapshot.
  """
  type Page {
    id: ID!
    workspaceId: ID!
    projectId: ID!
    """
    null = root-level page (no parent)
    """
    parentId: ID
    title: String!
    """
    Emoji or absolute URL for the page icon
    """
    icon: String
    coverUrl: String
    """
    Fractional index position for ordering within parent (e.g., 1.5 between 1.0 and 2.0)
    """
    position: Float!
    isArchived: Boolean!
    isLocked: Boolean!
    """
    S3 key for the latest compiled Yjs snapshot (disaster recovery reference)
    """
    s3Key: String
    createdBy: ID!
    createdAt: DateTime!
    updatedAt: DateTime!

    # ── Computed via DataLoader field resolvers ──────────
    collaborators: [PageCollaborator!]!
    creator: UserBasic!
    """
    Populated only by getProjectPages — empty in all other contexts
    """
    children: [Page!]!
  }

  type PageCollaborator {
    userId: ID!
    role: PageRole!
    joinedAt: DateTime!
    user: UserBasic!
  }

  enum PageRole {
    EDITOR
    VIEWER
    COMMENTER
  }

  """
  Returned by getPageSnapshot — everything the client needs to initialise the Y.Doc
  """
  type GetPageSnapshotResult {
    pageId: ID!
    """
    base64-encoded Y.encodeStateAsUpdate() — apply on client with Y.applyUpdate()
    """
    snapshot: String!
    """
    Last Redis Stream entry ID processed into this snapshot — used for gap-fill on subscribe
    """
    lastStreamId: String!
    """
    Unix timestamp (ms) of when this snapshot was compiled
    """
    snapshotTimestamp: Float!
  }
`;

// ─── Aggregate Export ─────────────────────────────────────────────────────────

export const typeDefs = [
  sharedTypeDefs,
  // Mutations
  createPageTypeDefs,
  deletePageTypeDefs,
  renamePageTypeDefs,
  archivePageTypeDefs,
  unarchivePageTypeDefs,
  lockPageTypeDefs,
  unlockPageTypeDefs,
  reorderPageTypeDefs,
  addPageCollaboratorsTypeDefs,
  removePageCollaboratorTypeDefs,
  updatePageDetailsTypeDefs,
  // Queries
  getPageTypeDefs,
  getPageSnapshotTypeDefs,
  getProjectPagesTypeDefs,
  getPageCollaboratorsTypeDefs,
  getActivePageCollaboratorsTypeDefs,
];
