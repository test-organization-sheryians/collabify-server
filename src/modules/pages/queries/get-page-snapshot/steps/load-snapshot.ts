/**
 * Step 2 — Load Snapshot
 *
 * Loads the base Yjs snapshot via three paths in priority order:
 *   HIT  — Redis getBuffer() → raw binary (fast path, <10ms)
 *   MISS — S3 downloadPageSnapshot() → warm Redis cache (~100ms)
 *   NEW  — No s3Key → empty Y.Doc state as binary, snapshotStreamId '0-0'
 *
 * IMPORTANT: Pages stores snapshot as raw binary in Redis (no JSON wrapper).
 * Use ctx.redis.getBuffer() NOT ctx.redis.get().
 * Whiteboard uses { snapshot: base64, streamId, version } JSON — pages does not.
 *
 * All three paths return the SAME shape: { snapshotBinary, snapshotStreamId }.
 * The handler always proceeds to applyStreamDelta regardless of which path ran.
 *
 * WHY: A brand-new page (no s3Key) may already have stream entries written by
 * the first collaborator before the stream worker has compacted a snapshot.
 * Returning early would miss those updates. snapshotStreamId '0-0' causes
 * applyStreamDelta to XRANGE from the very beginning of the stream.
 */

import { Y } from "@/shared/yjs";
import { createLogger } from "@/shared/lib/logger";
import { PageKeys, PageTTLs } from "../../../infra/page-keys";
import { downloadPageSnapshot } from "../../../infra/page-storage";
import type { ServiceContext } from "@/graphql/types";
import type { PageRow, LoadSnapshotResult } from "../types";

const logger = createLogger("pages:queries:get-page-snapshot:load-snapshot");

const S3_TIMEOUT_MS = 10_000;

export async function loadSnapshot(
  page: PageRow,
  pageId: string,
  ctx: ServiceContext
): Promise<LoadSnapshotResult> {
  const snapshotKey = PageKeys.PageSnapshotLatest(pageId);

  // ── Path 1: Redis HIT (fast, <10ms) ──────────────────────────────────────────
  const cached = await ctx.redis.getBuffer(snapshotKey);
  if (cached) {
    logger.info("Redis HIT", { pageId, size: cached.length });
    return {
      snapshotBinary: cached,
      snapshotStreamId: page.lastSnapshotStreamId ?? "0-0",
    };
  }

  // ── Path 2: S3 fallback (~100ms) ─────────────────────────────────────────────
  if (page.s3Key) {
    logger.info("Redis MISS — loading from S3", { pageId, s3Key: page.s3Key });

    const s3Binary = await Promise.race([
      downloadPageSnapshot(page.s3Key),
      new Promise<never>((_, rej) =>
        setTimeout(() => rej(new Error("S3 timeout after 10s")), S3_TIMEOUT_MS)
      ),
    ]);

    if (!s3Binary) {
      // S3 key in DB but object gone — fall through to empty base + check stream
      logger.warn("S3 object not found — falling back to empty base", {
        pageId,
        s3Key: page.s3Key,
      });
      return buildEmptyBase(pageId);
    }

    // Warm Redis cache for subsequent requests
    await ctx.redis.setex(snapshotKey, PageTTLs.SNAPSHOT_REDIS, s3Binary);
    logger.info("S3 snapshot loaded + Redis cache warmed", {
      pageId,
      size: s3Binary.length,
    });

    return {
      snapshotBinary: s3Binary,
      snapshotStreamId: page.lastSnapshotStreamId ?? "0-0",
    };
  }

  // ── Path 3: Brand new page (no s3Key yet) ────────────────────────────────────
  // Return empty Y.Doc state as the base. applyStreamDelta will read from '0-0'
  // (beginning of stream) and apply any updates written before first compaction.
  logger.info("New page — using empty Y.Doc base, will check stream", {
    pageId,
  });
  return buildEmptyBase(pageId);
}

/**
 * Build an empty Y.Doc encoded as a binary update.
 * snapshotStreamId '0-0' means applyStreamDelta reads ALL stream entries.
 */
function buildEmptyBase(pageId: string): LoadSnapshotResult {
  const emptyDoc = new Y.Doc({ guid: pageId });
  const emptyState = Buffer.from(Y.encodeStateAsUpdate(emptyDoc));
  emptyDoc.destroy();
  return {
    snapshotBinary: emptyState,
    snapshotStreamId: "0-0",
  };
}
