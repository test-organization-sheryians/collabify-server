import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import { Y } from "@/shared/yjs";
import { safeApplyUpdate } from "@/shared/lib/safe-apply-update";
import { PageKeys, PageTTLs } from "../../infra/page-keys";
import { downloadPageSnapshot } from "../../infra/page-storage";
import type { GetPageSnapshotInput } from "./index";

const logger = createLogger("pages:queries:get-page-snapshot");

/**
 * getPageSnapshot handler — bidirectional sync query.
 *
 * Returns the current authoritative Y.Doc snapshot + lastStreamId for gap-fill.
 * If clientSnapshot is provided, merges client's offline delta back to the stream.
 *
 * Mirrors get-board-snapshot in the whiteboard module exactly.
 *
 * Workflow:
 * 1. Auth + page fetch + access check
 * 2. Load snapshot: Redis (fast) → S3 fallback → empty doc for new pages
 * 3. Apply stream delta (worker lag window)
 * 4. Bidirectional sync: merge client's offline edits → write to stream → broadcast
 * 5. Compute server→client diff
 * 6. Return { snapshot (diff), lastStreamId, snapshotTimestamp }
 */
export const getPageSnapshotHandler = async (
  input: GetPageSnapshotInput,
  ctx: ServiceContext
) => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated");

  const { pageId, clientSnapshot } = input;
  const startTime = Date.now();

  logger.info("get-page-snapshot: handler entry", { pageId, userId });

  try {
    // Step 1 — Access check
    // TODO: const page = await ctx.db.page.findFirst({
    //   where: { id: pageId, deletedAt: null, OR: [{ createdBy: userId }, { collaborators: { some: { userId } } }] },
    //   select: { id: true, s3Key: true, lastSnapshotStreamId: true, lastSnapshotAt: true },
    // })
    // if (!page) throw AppError.forbidden("Page not found or you do not have access")

    // Step 2 — Load snapshot (Redis → S3 → empty)
    // TODO: const snapshotKey = PageKeys.PageSnapshotLatest(pageId)
    // let snapshotBinary: Uint8Array
    // let snapshotStreamId: string
    // let redisHit = false
    //
    // const cached = await ctx.redis.getBuffer(snapshotKey)
    // if (cached) {
    //   snapshotBinary = cached
    //   snapshotStreamId = page.lastSnapshotStreamId || '0-0'
    //   redisHit = true
    //   logger.info("Redis HIT", { pageId })
    // } else if (page.s3Key) {
    //   const s3Binary = await Promise.race([downloadPageSnapshot(page.s3Key), timeout(10_000)])
    //   snapshotBinary = s3Binary
    //   snapshotStreamId = page.lastSnapshotStreamId || '0-0'
    //   // Warm Redis cache
    //   await ctx.redis.setex(snapshotKey, PageTTLs.SNAPSHOT_REDIS, s3Binary)
    //   logger.info("S3 snapshot loaded + cache warmed", { pageId, size: s3Binary.length })
    // } else {
    //   // New page — return empty Y.Doc
    //   const emptyDoc = new Y.Doc({ guid: pageId })
    //   return { pageId, snapshot: Buffer.from(Y.encodeStateAsUpdate(emptyDoc)).toString('base64'), lastStreamId: '0-0', snapshotTimestamp: null }
    // }

    // Step 3 — Apply stream delta (worker lag window)
    // TODO: const tempDoc = new Y.Doc({ guid: pageId })
    // Y.applyUpdate(tempDoc, snapshotBinary)
    // const streamKey = PageKeys.PageStream(pageId)
    // const newerUpdates = await ctx.redis.xrange(streamKey, `(${snapshotStreamId}`, '+', 'COUNT', 5000) as Array<[string, string[]]>
    // let lastStreamId = snapshotStreamId
    // for (const [id, fields] of newerUpdates) { ... Y.applyUpdate ... lastStreamId = id }

    // Step 4 — Bidirectional sync (if clientSnapshot provided)
    // TODO: Mirror whiteboard get-board-snapshot handler exactly:
    // - Compute server state vector
    // - Diff: what client has that server doesn't
    // - Apply client delta to tempDoc
    // - Write to stream via Lua CLIENT_SYNC_SCRIPT
    // - Publish to PageEvents pub/sub channel

    // Step 5 — Compute server→client diff
    // TODO: let clientStateVector: Uint8Array | undefined
    // if (clientSnapshot) { ... derive from clientSnapshot ... }
    // const diff = Y.encodeStateAsUpdate(tempDoc, clientStateVector)
    // tempDoc.destroy()

    // Step 6 — Log metrics + return
    // logger.info("Snapshot served", { pageId, redisHit, latencyMs: Date.now() - startTime })
    // return { pageId, snapshot: Buffer.from(diff).toString('base64'), lastStreamId, snapshotTimestamp: page.lastSnapshotAt }

    throw new AppError(
      "getPageSnapshot: not yet implemented",
      "INTERNAL_SERVER_ERROR"
    );
  } catch (error: unknown) {
    if (error instanceof AppError) throw error;
    logger.error("Failed in get-page-snapshot", {
      err: error,
      pageId,
      userId,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    throw new AppError("Failed to fetch page snapshot");
  }
};
