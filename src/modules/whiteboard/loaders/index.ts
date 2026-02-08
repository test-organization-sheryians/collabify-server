import { createUserByIdLoader, type UserBasic } from "./user-by-id-loader";
import {
  createCollaboratorsByBoardIdLoader,
  type CollaboratorWithUser,
} from "./collaborators-by-board-id-loader";

/**
 * Whiteboard DataLoaders
 *
 * Efficiently batch and cache database queries for:
 * - Users (for creator field resolution)
 * - Collaborators (for collaborators field resolution)
 */

export const createWhiteboardLoaders = () => ({
  userById: createUserByIdLoader(),
  collaboratorsByBoardId: createCollaboratorsByBoardIdLoader(),
});

export type WhiteboardLoaders = ReturnType<typeof createWhiteboardLoaders>;

// Re-export types
export type { UserBasic, CollaboratorWithUser };
