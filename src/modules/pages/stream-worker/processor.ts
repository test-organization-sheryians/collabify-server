/**
 * Stream Worker Processor — applies Yjs update batches and decides when to snapshot.
 *
 * SEPARATED from worker-loops.ts to enable testing without a live Redis/DB dependency.
 * processor.ts is pure logic: applyUpdateBatch transforms raw entries into a Y.Doc.
 * rebuildPageSnapshot handles the full 9-step compaction flow.
 */

import type { Redis } from "ioredis";
import type { PrismaClient } from "@prisma/client";
import { createLogger } from "@/shared/lib/logger";
import { Y } from "@/shared/yjs";
import { PageKeys, PageTTLs } from "../infra/page-keys";
import { saveSnapshotToS3 } from "./worker-storage";
import { SNAPSHOT_LOCK_RELEASE_SCRIPT } from "../infra/lua/snapshot-lock";
import { ThresholdRegistry } from "./thresholds/index";
import { CooldownThreshold } from "./thresholds/cooldown";
import { safeApplyPageUpdate } from "../infra/safe-apply-update";
import type { RawStreamEntry, PageUpdateResult } from "./types";

const logger = createLogger("pages:stream-worker:processor");

// ─── applyUpdateBatch ─────────────────────────────────────────────────────────

/**
 * Apply a batch of raw XREADGROUP entries to an in-memory Y.Doc.
 *
 * Uses safeApplyPageUpdate (not Y.applyUpdate directly) so a single
 * corrupt entry never stalls the entire batch — failure is logged and skipped.
 *
 * @param entries      Raw stream entries from XREADGROUP
 * @param existingDoc  Pass an existing Y.Doc to accumulate updates across chunks.
 *                     If omitted, a fresh doc is created.
 */
export function applyUpdateBatch(
  entries: RawStreamEntry[],
  existingDoc?: Y.Doc
): PageUpdateResult {
  if (entries.length === 0) {
    throw new Error("applyUpdateBatch called with empty entries");
  }

  const pageId = entries[0].fields.pageId;
  const doc = existingDoc ?? new Y.Doc({ guid: pageId });

  // Initialize shared types — must match Tiptap's internal binding
  doc.getXmlFragment("content");
  doc.getMap("meta");

  let latestStreamId = "";
  let updateCount = 0;

  for (const entry of entries) {
    const binary = Buffer.from(entry.fields.update, "base64");
    const result = safeApplyPageUpdate(
      doc,
      binary,
      {
        context: "worker:batch",
        pageId,
        streamId: entry.id,
        throwOnError: false,
      },
      logger
    );

    if (result.success) {
      latestStreamId = entry.id;
      updateCount++;
    }
  }

  return { pageId, doc, updateCount, latestStreamId };
}

// ─── shouldSnapshot ───────────────────────────────────────────────────────────

/**
 * Checks all registered thresholds to decide if a snapshot should be built.
 * Delegates to ThresholdRegistry — ANY threshold met returns true.
 */
export async function shouldSnapshot(
  pageId: string,
  thresholdRegistry: ThresholdRegistry,
  redis: Redis
): Promise<boolean> {
  return thresholdRegistry.shouldCreateSnapshot({ pageId, redis });
}

// ─── rebuildPageSnapshot ──────────────────────────────────────────────────────

/**
 * Full snapshot rebuild — 9-step flow:
 *
 *   1. Acquire snapshot lock (SET NX EX) — skip if another worker owns it
 *   2. Load base snapshot (Redis getBuffer → S3 fallback → empty)
 *   3. Apply base to a fresh Y.Doc
 *   4. XRANGE ALL stream entries → safeApplyPageUpdate each
 *   5. Y.encodeStateAsUpdate → newBinary
 *   6. Atomic Lua: SET snapshot:latest + XTRIM (1 RTT)
 *   7. S3: historical then latest (crash-safe ordering in saveSnapshotToS3)
 *   8. DB: page.update({ s3Key, lastSnapshotStreamId, lastSnapshotAt })
 *   9. doc.destroy() in finally (always — prevents Y.Doc memory leak)
 */
export async function rebuildPageSnapshot(
  pageId: string,
  doc: Y.Doc,
  redis: Redis,
  db: PrismaClient,
  consumerName: string
): Promise<void> {
  const lockKey = PageKeys.PageSnapshotLock(pageId);

  // 1. Acquire snapshot lock
  const acquired = await redis.set(
    lockKey,
    consumerName,
    "EX",
    PageTTLs.SNAPSHOT_LOCK,
    "NX"
  );

  if (!acquired) {
    logger.info("Snapshot lock held by another worker — skipping", {
      pageId,
    });
    return;
  }

  const startTime = Date.now();

  try {
    logger.info("Snapshot rebuild started", { pageId, consumerName });

    // 2. Load base snapshot (Redis-first, S3 fallback)
    const cached = await redis.getBuffer(PageKeys.PageSnapshotLatest(pageId));

    if (cached) {
      logger.debug("Loaded base snapshot from Redis", {
        pageId,
        bytes: cached.length,
      });
      safeApplyPageUpdate(
        doc,
        cached,
        { context: "worker:load-base-redis", pageId, throwOnError: false },
        logger
      );
    } else {
      // S3 fallback
      logger.debug("Redis miss — trying S3 fallback", { pageId });
      const { downloadPageSnapshot } = await import("../infra/page-storage.js");
      const s3Binary = await downloadPageSnapshot(pageId).catch(() => null);

      if (s3Binary) {
        logger.info("Loaded base snapshot from S3", {
          pageId,
          bytes: s3Binary.length,
        });
        safeApplyPageUpdate(
          doc,
          s3Binary,
          { context: "worker:load-base-s3", pageId, throwOnError: false },
          logger
        );
      } else {
        logger.info("No base snapshot — fresh Y.Doc", { pageId });
      }
    }

    // 3. Base already applied to doc above (doc came in empty from caller)
    // 4. XRANGE ALL — apply all stream entries on top of base
    const allEntries = (await redis.xrange(
      PageKeys.PageStream(pageId),
      "-",
      "+",
      "COUNT",
      10_000
    )) as Array<[string, string[]]>;

    logger.info("Applying stream entries to Y.Doc", {
      pageId,
      count: allEntries.length,
    });

    let lastStreamId = "0-0";
    let applied = 0;

    for (const [id, fields] of allEntries) {
      const data = parseFields(fields);
      if (!data) continue;

      const binary = Buffer.from(data.update, "base64");
      const result = safeApplyPageUpdate(
        doc,
        binary,
        {
          context: "worker:rebuild",
          pageId,
          streamId: id,
          throwOnError: false,
        },
        logger
      );

      if (result.success) {
        lastStreamId = id;
        applied++;
      }
    }

    logger.info("Stream entries applied", {
      pageId,
      total: allEntries.length,
      applied,
      skipped: allEntries.length - applied,
      lastStreamId,
    });

    // 5. Encode full state
    const newBinary = Buffer.from(Y.encodeStateAsUpdate(doc));

    // 6. Atomic Redis update: SET snapshot:latest + XTRIM
    await redis.setex(
      PageKeys.PageSnapshotLatest(pageId),
      PageTTLs.SNAPSHOT_REDIS,
      newBinary
    );

    if (lastStreamId !== "0-0") {
      await redis.xtrim(PageKeys.PageStream(pageId), "MINID", lastStreamId);
    }

    logger.debug("Redis snapshot updated and stream trimmed", {
      pageId,
      lastStreamId,
      bytes: newBinary.length,
    });

    // 7. S3 (historical first, then latest — crash-safe)
    const { latestKey } = await saveSnapshotToS3(pageId, newBinary);

    // 8. DB update — keeps s3Key + lastSnapshotStreamId in sync
    await db.page.update({
      where: { id: pageId },
      data: {
        s3Key: latestKey,
        lastSnapshotStreamId: lastStreamId,
        lastSnapshotAt: new Date(),
      },
    });

    // Record snapshot timestamp for CooldownThreshold
    await CooldownThreshold.recordSnapshot(pageId, redis);

    logger.info("Snapshot rebuild complete", {
      pageId,
      lastStreamId,
      bytes: newBinary.length,
      latencyMs: Date.now() - startTime,
    });
  } finally {
    // 9. Release lock (Lua ownership check — safe even if lock expired mid-rebuild)
    await redis
      .eval(SNAPSHOT_LOCK_RELEASE_SCRIPT, 1, lockKey, consumerName)
      .catch((err) => logger.error("Lock release failed", { pageId, err }));

    // Always destroy Y.Doc — prevents memory leak
    doc.destroy();
  }
}

// ─── Internal Helpers ─────────────────────────────────────────────────────────

function parseFields(fields: string[]): { update: string } | null {
  const data: Record<string, string> = {};
  for (let i = 0; i < fields.length; i += 2) data[fields[i]] = fields[i + 1];
  if (!data.update) return null;
  return { update: data.update };
}
