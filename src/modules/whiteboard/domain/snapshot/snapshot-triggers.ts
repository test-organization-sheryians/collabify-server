/**
 * Snapshot Trigger Logic
 *
 * Determines when a new snapshot should be created
 */

export type SnapshotTrigger = {
  shouldSnapshot: boolean;
  reason?: string;
};

/**
 * Evaluate if snapshot is needed based on stream health
 */
export const shouldCreateSnapshot = async (
  boardId: string,
  currentStreamLength: number,
  timeSinceLastSnapshot: number, // milliseconds
  streamSizeBytes: number
): Promise<SnapshotTrigger> => {
  // TODO: V4 Architecture - Snapshot Triggers
  // ============================================
  //
  // TRIGGER CONDITIONS (OR logic - any one triggers snapshot):
  //
  // 1. Stream Length Threshold
  // --------------------------
  // - If currentStreamLength > 10,000 updates
  // - Reason: "Stream too long (10k+ updates)"
  //
  // 2. Time-Based Threshold
  // -----------------------
  // - If timeSinceLastSnapshot > 24 hours (86400000ms)
  // - Reason: "Daily snapshot schedule"
  //
  // 3. Stream Size Threshold
  // ------------------------
  // - If streamSizeBytes > 50MB (52428800 bytes)
  // - Reason: "Stream memory usage exceeded 50MB"
  //
  // 4. Inactivity Threshold
  // -----------------------
  // - If no subscribers AND no updates in last 5 minutes
  // - Reason: "Board idle - archiving state"
  //
  // RETURN LOGIC:
  // ------------
  // if (any condition met) {
  //   return { shouldSnapshot: true, reason: "..." };
  // }
  // return { shouldSnapshot: false };
  //
  // CONFIGURATION:
  // - These thresholds should be configurable via env vars
  // - Development: lower thresholds for testing
  // - Production: higher thresholds to reduce S3 costs
  //
  // ============================================

  throw new Error("TODO: Implement shouldCreateSnapshot");
};
