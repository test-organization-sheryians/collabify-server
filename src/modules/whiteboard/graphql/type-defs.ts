// Services (Mutations)
import { typeDefs as createBoardTypeDefs } from "../services/create-board/type-defs";
import { typeDefs as deleteBoardTypeDefs } from "../services/delete-board/type-defs";
import { typeDefs as renameBoardTypeDefs } from "../services/rename-board/type-defs";
import { typeDefs as updateBoardDescriptionTypeDefs } from "../services/update-board-description/type-defs";
import { typeDefs as addBoardCollaboratorsTypeDefs } from "../services/add-board-collaborators/type-defs";
import { typeDefs as removeBoardCollaboratorTypeDefs } from "../services/remove-board-collaborator/type-defs";
import { typeDefs as archiveBoardTypeDefs } from "../services/archive-board/type-defs";
import { typeDefs as unarchiveBoardTypeDefs } from "../services/unarchive-board/type-defs";
import { typeDefs as lockBoardTypeDefs } from "../services/lock-board/type-defs";
import { typeDefs as unlockBoardTypeDefs } from "../services/unlock-board/type-defs";

// Queries
import { typeDefs as getBoardTypeDefs } from "../queries/get-board/type-defs";
import { typeDefs as getUserBoardsTypeDefs } from "../queries/get-user-boards/type-defs";
import { typeDefs as getBoardCollaboratorsTypeDefs } from "../queries/get-board-collaborators/type-defs";
import { typeDefs as getWorkspaceBoardsTypeDefs } from "../queries/get-workspace-boards/type-defs";
import { typeDefs as getBoardSnapshotTypeDefs } from "../queries/get-board-snapshot/type-defs";
import { typeDefs as getActiveCollaboratorsTypeDefs } from "../queries/get-active-collaborators/type-defs";

// Shared types (base types used across the module)
const sharedTypeDefs = /* GraphQL */ `
  type Whiteboard {
    id: ID!
    workspaceId: ID!
    projectId: ID
    title: String!
    description: String
    elementCount: Int!
    fileSizeBytes: String!
    isArchived: Boolean!
    isLocked: Boolean!
    createdBy: ID!
    createdAt: DateTime!
    updatedAt: DateTime!
    deletedAt: DateTime
    # Computed fields (resolved via field resolvers)
    collaborators: [BoardCollaborator!]
    creator: UserBasic!
  }

  type BoardCollaborator {
    userId: ID!
    joinedAt: DateTime!
    user: UserBasic!
  }

  type UserBasic {
    id: ID!
    fullName: String!
    email: String!
    avatarUrl: String
  }
`;

// Export aggregated type definitions
export const typeDefs = [
  sharedTypeDefs,
  // Services (Mutations)
  createBoardTypeDefs,
  deleteBoardTypeDefs,
  renameBoardTypeDefs,
  updateBoardDescriptionTypeDefs,
  addBoardCollaboratorsTypeDefs,
  removeBoardCollaboratorTypeDefs,
  archiveBoardTypeDefs,
  unarchiveBoardTypeDefs,
  lockBoardTypeDefs,
  unlockBoardTypeDefs,
  // Queries
  getBoardTypeDefs,
  getUserBoardsTypeDefs,
  getBoardCollaboratorsTypeDefs,
  getWorkspaceBoardsTypeDefs,
  getBoardSnapshotTypeDefs,
  getActiveCollaboratorsTypeDefs,
];
