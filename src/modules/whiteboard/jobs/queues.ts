import { createQueue } from "@/services/bullmq";
/**
 * Whiteboard BullMQ Queues
 *
 * Queue definitions for background jobs
 */

/**
 * Queue names for whiteboard module
 */
export const WhiteboardQueues = {
  SNAPSHOT: "whiteboard-snapshot",
  CLEANUP: "whiteboard-cleanup",
} as const;

/**
 * Snapshot Queue
 * Creates S3 snapshots and trims Redis streams
 */
export const whiteboardSnapshotQueue = createQueue<SnapshotJobData>(
  WhiteboardQueues.SNAPSHOT
);

/**
 * Cleanup Queue
 * Cleans up inactive boards
 */
export const whiteboardCleanupQueue = createQueue<CleanupJobData>(
  WhiteboardQueues.CLEANUP
);

/**
 * Job Data Types
 */
export type SnapshotJobData = {
  boardId: string;
  triggerReason: string; // e.g., "stream_length_exceeded", "daily_schedule"
};

export type CleanupJobData = {
  boardId: string;
  inactiveDays: number;
};
