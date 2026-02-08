import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import { logger } from "@/shared/logger";
import { CreateBoardInput } from "./types";
import { uploadSnapshot } from "../../infra/s3-client";
import { WhiteboardKeys } from "../../infra/whiteboard-keys";

/**
 * Create Board Handler
 *
 * Creates a new whiteboard with optional collaborators.
 * - Initializes empty Y.Doc state for Excalidraw
 * - Validates collaborators are workspace members
 * - Creates board + collaborators atomically
 * - Returns board and successfully added collaborators
 */
export const handler = async (input: CreateBoardInput, ctx: ServiceContext) => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated");

  try {
    // Step 1: Authorization - User must be workspace member
    const creatorMembership = await ctx.db.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          userId,
          workspaceId: input.workspaceId,
        },
      },
    });

    if (!creatorMembership) {
      throw AppError.forbidden("You are not a member of this workspace");
    }

    // Step 2: Validate Project (if provided)
    if (input.projectId) {
      const project = await ctx.db.project.findUnique({
        where: { id: input.projectId },
        select: { workspaceId: true },
      });

      if (!project || project.workspaceId !== input.workspaceId) {
        throw AppError.badRequest("Invalid project ID for this workspace");
      }
    }

    // Step 3: Validate Collaborators (if provided)
    let validCollaboratorIds: string[] = [];

    if (input.collaboratorIds && input.collaboratorIds.length > 0) {
      // Remove duplicates and creator (will be added automatically)
      const uniqueCollaboratorIds = Array.from(
        new Set(input.collaboratorIds.filter((id) => id !== userId))
      );

      if (uniqueCollaboratorIds.length > 0) {
        // Batch check: Are they workspace members?
        const workspaceMembers = await ctx.db.workspaceMember.findMany({
          where: {
            workspaceId: input.workspaceId,
            userId: { in: uniqueCollaboratorIds },
          },
          select: { userId: true },
        });

        validCollaboratorIds = workspaceMembers.map((m) => m.userId);

        // Log warning for invalid users (graceful degradation)
        const invalidUsers = uniqueCollaboratorIds.filter(
          (id) => !validCollaboratorIds.includes(id)
        );

        if (invalidUsers.length > 0) {
          logger.warn({
            msg: "Some users are not workspace members and will be skipped",
            workspaceId: input.workspaceId,
            invalidUsers,
            boardTitle: input.title,
          });
        }

        // TODO: FUTURE - Add stricter project member validation
        // Once project membership system is mature, add this check:
        //
        // if (input.projectId) {
        //   const projectMembers = await ctx.db.projectMember.findMany({
        //     where: {
        //       projectId: input.projectId,
        //       userId: { in: [userId, ...validCollaboratorIds] }
        //     }
        //   });
        //
        //   const nonProjectMembers = validCollaboratorIds.filter(
        //     id => !projectMembers.some(pm => pm.userId === id)
        //   );
        //
        //   if (nonProjectMembers.length > 0) {
        //     throw AppError.forbidden(
        //       "Some users are not project members"
        //     );
        //   }
        // }
      }
    }

    // Step 4: Initialize Y.Doc
    const Y = await import("yjs");
    const ydoc = new Y.Doc();

    // Initialize Excalidraw structure
    const yExcalidrawData = ydoc.getMap("excalidraw");
    yExcalidrawData.set("elements", new Y.Array());
    yExcalidrawData.set("appState", new Y.Map());

    // Encode to binary
    const initialState = Y.encodeStateAsUpdate(ydoc);

    // Step 5: Create Board + Collaborators (Atomic Transaction)
    const result = await ctx.db.$transaction(async (tx) => {
      // 5.1 Create whiteboard
      const board = await tx.whiteboard.create({
        data: {
          workspaceId: input.workspaceId,
          projectId: input.projectId,
          title: input.title,
          description: input.description,
          createdBy: userId,
          s3Key: "", // TODO V4-1: Will be updated after S3 upload
          elementCount: 0,
          fileSizeBytes: BigInt(initialState.byteLength),
        },
      });

      // 5.2 Add creator as collaborator
      await tx.whiteboardCollaborator.create({
        data: {
          whiteboardId: board.id,
          userId: userId,
        },
      });

      // 5.3 Add additional collaborators (if any valid ones)
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
        // Bulk create collaborators
        await tx.whiteboardCollaborator.createMany({
          data: validCollaboratorIds.map((collaboratorId) => ({
            whiteboardId: board.id,
            userId: collaboratorId,
            addedBy: userId,
          })),
          skipDuplicates: true,
        });

        // Fetch created collaborators for response
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

    // V4-1: Upload initial snapshot to S3
    const s3Key = await uploadSnapshot(result.board.id, initialState, {
      boardId: result.board.id,
      streamId: "0-0",
      timestamp: Date.now(),
      elementCount: 0,
    });

    await ctx.db.whiteboard.update({
      where: { id: result.board.id },
      data: { s3Key },
    });

    // V4-2: Create Redis stream + consumer group
    const streamKey = WhiteboardKeys.BoardStream(result.board.id);
    const sequenceKey = WhiteboardKeys.BoardSequence(result.board.id);

    try {
      // Create consumer group (creates stream if doesn't exist)
      await ctx.redis.xgroup(
        "CREATE",
        streamKey,
        "whiteboard-workers",
        "0",
        "MKSTREAM"
      );

      // Initialize sequence counter
      await ctx.redis.set(sequenceKey, 0);

      logger.info({
        msg: "Redis stream initialized",
        boardId: result.board.id,
        streamKey,
      });
    } catch (error) {
      // Ignore "BUSYGROUP Consumer Group name already exists"
      const err = error as Error;
      if (!err.message?.includes("BUSYGROUP")) {
        logger.error({
          err: error,
          msg: "Failed to create Redis stream",
          boardId: result.board.id,
        });
        throw error;
      }
    }

    // Log success
    logger.info({
      msg: "Board created successfully",
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
    // Re-throw AppErrors
    if (error instanceof AppError) throw error;

    // Log unexpected errors
    logger.error({
      err: error,
      msg: "Failed to create board",
      workspaceId: input.workspaceId,
      userId,
    });

    // Default fallback
    throw new AppError("Failed to create whiteboard");
  }
};
