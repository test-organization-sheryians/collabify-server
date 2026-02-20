/**
 * getPageSnapshot — Return types.
 *
 * PageSnapshot is the GraphQL resolver return.
 * - `snapshot`  — base64 Yjs diff. Client: Y.applyUpdate(localDoc, decode(snapshot))
 * - `lastStreamId` — passed to subscribe-page for gap-fill replay
 * - `snapshotTimestamp` — when stream worker last compacted (null for new pages)
 *
 * pageId is NOT included — client already knows which page they opened.
 */
export type PageSnapshot = {
  snapshot: string;
  lastStreamId: string;
  snapshotTimestamp: Date | null;
};

/**
 * Minimal page row shape returned by validate-access step.
 */
export type PageRow = {
  id: string;
  s3Key: string | null;
  lastSnapshotStreamId: string | null;
  lastSnapshotAt: Date | null;
};

/**
 * Result from load-snapshot step. Always a binary snapshot + stream cursor.
 *
 * New pages (no s3Key): snapshotBinary = empty Y.Doc state, snapshotStreamId = '0-0'.
 * applyStreamDelta will XRANGE from '0-0' to '+' and pick up any stream entries
 * written before the first snapshot compaction — this is the correct behaviour.
 */
export type LoadSnapshotResult = {
  snapshotBinary: Buffer;
  snapshotStreamId: string;
};
