import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import { Y } from "@/shared/yjs";
import type { ServiceContext } from "@/graphql/types";
import type { GetPageSnapshotInput } from "./index";
import type { PageSnapshot } from "./types";

import { validateAccess } from "./steps/validate-access";
import { loadSnapshot } from "./steps/load-snapshot";
import { applyStreamDelta } from "./steps/apply-stream-delta";

const logger = createLogger("pages:queries:get-page-snapshot");

/**
 * getPageSnapshot — orchestrator
 *
 * Execution order:
 *   1. validateAccess   — auth + page DB fetch
 *   2. loadSnapshot     — Redis → S3 → empty (early-return for new pages)
 *   3. applyStreamDelta — XRANGE worker lag window onto tempDoc
 *   4. encode full state — Y.encodeStateAsUpdate(tempDoc) → base64
 *
 * No clientSnapshot / bidirectional sync:
 * Client always starts with an empty Y.Doc. Server sends its full current
 * state as a Y.js update. Client applies it as origin 'server:snapshot'.
 *
 * See README.md for full system design.
 */
export const getPageSnapshotHandler = async (
  input: GetPageSnapshotInput,
  ctx: ServiceContext
): Promise<PageSnapshot> => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated");

  const { pageId } = input;
  const startTime = Date.now();

  logger.info("Handler entry", { pageId, userId });

  try {
    // 1. Auth + page fetch
    const page = await validateAccess(input, ctx, userId);

    // 2. Load base snapshot (Redis → S3 → empty Y.Doc base)
    // Always returns { snapshotBinary, snapshotStreamId }.
    // New pages: snapshotBinary = empty state, snapshotStreamId = '0-0'
    // so applyStreamDelta reads ALL stream entries (pre-compaction edits).
    const { snapshotBinary, snapshotStreamId } = await loadSnapshot(
      page,
      pageId,
      ctx
    );

    // 3. Apply stream delta (worker lag window)
    // snapshotStreamId '0-0' on new pages → reads full stream from beginning
    const { tempDoc, lastStreamId } = await applyStreamDelta(
      pageId,
      snapshotBinary,
      snapshotStreamId,
      ctx
    );

    // 4. Encode full server state as Yjs update
    // Client has an empty Y.Doc — no state vector needed.
    // Server snapshot IS the origin: client applies with origin 'server:snapshot'.
    // IMPORTANT: tempDoc.destroy() is in a finally block to prevent memory leaks
    // if encodeStateAsUpdate throws unexpectedly.
    let snapshot: string;
    try {
      const fullState = Y.encodeStateAsUpdate(tempDoc);
      snapshot = Buffer.from(fullState).toString("base64");

      logger.info("Snapshot served", {
        pageId,
        userId,
        lastStreamId,
        snapshotBytes: fullState.length,
        latencyMs: Date.now() - startTime,
      });
    } finally {
      tempDoc.destroy(); // always free — Y.Doc holds observers and GC roots
    }

    return {
      snapshot,
      lastStreamId,
      snapshotTimestamp: page.lastSnapshotAt,
    };
  } catch (error: unknown) {
    if (error instanceof AppError) throw error;
    logger.error("Unexpected error", {
      err: error,
      pageId,
      userId,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    throw new AppError("Failed to fetch page snapshot");
  }
};
