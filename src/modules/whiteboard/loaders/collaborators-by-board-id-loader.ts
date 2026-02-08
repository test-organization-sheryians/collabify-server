import DataLoader from "dataloader";
import { db } from "@/infra/db";
import { WhiteboardCollaborator } from "@prisma/client";
import { UserBasic } from "./user-by-id-loader";

/**
 * Collaborators Loader - Batch collaborator lookups by board ID
 * Used by Whiteboard.collaborators field resolver
 *
 * Returns array of collaborators with user info
 */

// Collaborator with user info
export type CollaboratorWithUser = WhiteboardCollaborator & {
  user: UserBasic;
};

export const createCollaboratorsByBoardIdLoader = () =>
  new DataLoader<string, CollaboratorWithUser[]>(async (boardIds) => {
    const collaborators = await db.whiteboardCollaborator.findMany({
      where: { whiteboardId: { in: [...boardIds] } },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { joinedAt: "asc" },
    });

    // Group collaborators by board ID
    const collaboratorMap = new Map<string, CollaboratorWithUser[]>();

    for (const collab of collaborators) {
      const existing = collaboratorMap.get(collab.whiteboardId) || [];
      existing.push(collab);
      collaboratorMap.set(collab.whiteboardId, existing);
    }

    // Return in same order as requested, empty array if no collaborators
    return boardIds.map((id) => collaboratorMap.get(id) || []);
  });
