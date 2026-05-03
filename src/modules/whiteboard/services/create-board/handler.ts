import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import { CreateBoardInput } from "./types";
import { uploadSnapshot } from "../../infra/s3-client";

const logger = createLogger("whiteboard:services:create-board");

/**
 * createBoard — Service Handler
 *
 * Creates a new whiteboard with optional collaborators.
 *
 * Auth:
 *   - assertProjectMember — cache-backed; creates within a project context
 *   - permissions.assert("whiteboard:create") — RBAC check
 * Falls back to assertWorkspaceMember if no projectId provided.
 */
export const handler = async (input: CreateBoardInput, ctx: ServiceContext) => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated");
  if (!ctx.authGate || !ctx.permissions) throw AppError.unauthorized();

  try {
    // Step 1 — membership gate (cache-backed)
    if (input.projectId) {
      const proj = await ctx.authGate.getProject(input.projectId);
      if (!proj || proj.workspaceId !== input.workspaceId)
        throw AppError.badRequest("Invalid project ID for this workspace");
      const scope = {
        type: "project" as const,
        id: input.projectId,
        workspaceId: input.workspaceId,
      };
      await Promise.all([
        ctx.authGate.assertProjectMember(input.projectId),
        ctx.permissions.assert("whiteboard:create", scope),
      ]);
    } else {
      // No projectId — workspace-level creation. whiteboard:create requires ProjectScope,
      // so guard with workspace:read membership check instead.
      const scope = { type: "workspace" as const, id: input.workspaceId };
      await Promise.all([
        ctx.authGate.assertWorkspaceMember(input.workspaceId),
        ctx.permissions.assert("workspace:read", scope),
      ]);
    }

    // Step 2 — validate collaborators are workspace members (graceful degradation)
    let validCollaboratorIds: string[] = [];

    if (input.collaboratorIds && input.collaboratorIds.length > 0) {
      const uniqueIds = Array.from(
        new Set(input.collaboratorIds.filter((id) => id !== userId))
      );
      if (uniqueIds.length > 0) {
        const workspaceMembers = await ctx.db.workspaceMember.findMany({
          where: { workspaceId: input.workspaceId, userId: { in: uniqueIds } },
          select: { userId: true },
        });
        validCollaboratorIds = workspaceMembers.map((m) => m.userId);
        const invalidUsers = uniqueIds.filter(
          (id) => !validCollaboratorIds.includes(id)
        );
        if (invalidUsers.length > 0) {
          logger.warn(
            "Some users are not workspace members and will be skipped",
            {
              workspaceId: input.workspaceId,
              invalidUsers,
              boardTitle: input.title,
            }
          );
        }
      }
    }

    // Step 3 — create board + collaborators atomically
    const result = await ctx.db.$transaction(async (tx) => {
      const board = await tx.whiteboard.create({
        data: {
          workspaceId: input.workspaceId,
          projectId: input.projectId,
          title: input.title,
          description: input.description,
          createdBy: userId,
          s3Key: "",
          elementCount: 0,
        },
      });

      await tx.whiteboardCollaborator.create({
        data: { whiteboardId: board.id, userId },
      });

      const addedCollaborators: Array<{
        id: string;
        whiteboardId: string;
        userId: string;
        joinedAt: Date;
        user: {
          id: string;
          email: string | null;
          fullName: string | null;
          avatarUrl: string | null;
        };
      }> = [];

      if (validCollaboratorIds.length > 0) {
        await tx.whiteboardCollaborator.createMany({
          data: validCollaboratorIds.map((cId) => ({
            whiteboardId: board.id,
            userId: cId,
          })),
          skipDuplicates: true,
        });
        const collaborators = await tx.whiteboardCollaborator.findMany({
          where: {
            whiteboardId: board.id,
            userId: { in: validCollaboratorIds },
          },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                fullName: true,
                avatarUrl: true,
              },
            },
          },
        });
        addedCollaborators.push(...collaborators);
      }

      return { board, addedCollaborators };
    });

    // Step 4 — initialize Y.Doc snapshot in S3
    const Y = await import("yjs");
    const ydoc = new Y.Doc({ guid: result.board.id });
    ydoc.getArray("elements");
    ydoc.getMap("assets");
    const initialState = Y.encodeStateAsUpdate(ydoc);
    const s3Key = await uploadSnapshot(result.board.id, initialState, {
      boardId: result.board.id,
      streamId: "0-0",
      timestamp: Date.now(),
      elementCount: 0,
    });

    await ctx.db.whiteboard.update({
      where: { id: result.board.id },
      data: { s3Key, lastSnapshotStreamId: "0-0", lastSnapshotAt: new Date() },
    });

    logger.info("Board created successfully", {
      boardId: result.board.id,
      title: result.board.title,
      workspaceId: result.board.workspaceId,
      projectId: result.board.projectId,
      creatorId: userId,
      collaboratorsAdded: result.addedCollaborators.length,
    });

    return {
      board: result.board,
      addedCollaborators: result.addedCollaborators,
    };
  } catch (error: unknown) {
    if (error instanceof AppError) throw error;
    logger.error("Failed to create board", {
      err: error,
      workspaceId: input.workspaceId,
      userId,
    });
    throw new AppError("Failed to create whiteboard");
  }
};
