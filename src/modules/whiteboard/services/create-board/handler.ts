import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import { CreateBoardInput } from "./types";

/**
 * Create Board Handler
 *
 * Creates a new whiteboard with initial empty Y.Doc state.
 * Initializes S3 snapshot and creates Redis stream for realtime collaboration.
 */
export const handler = async (input: CreateBoardInput, ctx: ServiceContext) => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated");

  try {
    // 1. Authorization: User must be a member of the workspace
    const membership = await ctx.db.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          userId,
          workspaceId: input.workspaceId,
        },
      },
    });

    if (!membership) {
      throw AppError.forbidden("You are not a member of this workspace");
    }

    // 2. Validate Project Integrity (if provided)
    if (input.projectId) {
      const project = await ctx.db.project.findUnique({
        where: { id: input.projectId },
        select: { workspaceId: true },
      });

      if (!project || project.workspaceId !== input.workspaceId) {
        throw AppError.badRequest("Invalid project ID for this workspace");
      }
    }

    // 3. Initialize empty Y.Doc
    const Y = await import("yjs");
    const ydoc = new Y.Doc();
    const initialState = Y.encodeStateAsUpdate(ydoc);

    // TODO V4-1: Upload initial snapshot to S3
    // When implementing, use this pattern:
    //
    // const { s3Key } = await ctx.s3.uploadSnapshot(board.id, initialState, {
    //   streamId: "0-0",              // Initial stream ID
    //   timestamp: Date.now(),
    //   elementCount: 0,
    // });
    //
    // S3 Path: boards/{board.id}/latest.yjs
    // Metadata: x-amz-meta-streamid, x-amz-meta-timestamp, x-amz-meta-element-count
    //
    // Then update board.s3Key with the returned key

    // 4. Create Whiteboard record
    const board = await ctx.db.whiteboard.create({
      data: {
        workspaceId: input.workspaceId,
        projectId: input.projectId,
        title: input.title,
        description: input.description,
        createdBy: userId,
        s3Key: "", // TODO: Will be updated after S3 upload (V4-1)
        elementCount: 0,
        fileSizeBytes: BigInt(initialState.byteLength),
      },
    });

    // TODO V4-2: Create Redis stream + consumer group
    // When implementing, use this pattern:
    //
    // await ctx.redis.xgroup(
    //   "CREATE",
    //   `board:${board.id}:stream`,  // Stream key
    //   "whiteboard-consumer",        // Consumer group name
    //   "0",                          // Start from beginning
    //   "MKSTREAM"                    // Create stream if doesn't exist
    // );
    //
    // This enables the background consumer to process updates
    // Consumer will:
    // - Merge updates into cache
    // - Create snapshots every 1000 updates
    // - Trim stream after snapshot

    return board;
  } catch (error: unknown) {
    // Re-throw AppErrors
    if (error instanceof AppError) throw error;

    // Default fallback
    throw new AppError("Failed to create whiteboard");
  }
};
