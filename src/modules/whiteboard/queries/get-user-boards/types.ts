import { z } from "zod";
import { getUserBoardsSchema } from "./schema";

export type GetUserBoardsInput = z.infer<typeof getUserBoardsSchema>;

export type BoardConnection = {
  boards: Array<{
    id: string;
    workspaceId: string;
    projectId: string | null;
    title: string;
    description: string | null;
    s3Key: string;
    elementCount: number;
    fileSizeBytes: bigint;
    isArchived: boolean;
    isLocked: boolean;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
  }>;
  nextCursor: string | null;
};
