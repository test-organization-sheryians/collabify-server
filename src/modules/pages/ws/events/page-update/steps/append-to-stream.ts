/**
 * Step 4 — Append To Stream
 *
 * Atomically appends the Yjs update to the page Redis Stream via Lua.
 * One RTT — the Lua script handles dedupe check + backpressure check + XADD
 * + SETEX dedup marker in a single atomic operation.
 *
 * WHY ATOMIC (Lua):
 * Without atomicity, two concurrent sockets retrying the same dedupeId could
 * both pass the EXISTS check before either executes XADD, resulting in
 * duplicate stream entries that corrupt CRDT state.
 *
 * RETURNS:
 *   { status: 'ok', streamId }       — update appended
 *   { status: 'duplicate' }          — already seen, skip broadcast
 *
 * THROWS:
 *   AppError("RATE_LIMIT_EXCEEDED")  — stream backpressure limit reached
 *
 * NOTE: Lua returns a flat 3-element array [ok, streamId, status].
 * NOT a JSON string — do not JSON.parse(). Parse as [string, string, string].
 */

import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import { ATOMIC_PAGE_UPDATE_SCRIPT } from "../../../../infra/lua/page-update";
import { PageKeys, PageTTLs } from "../../../../infra/page-keys";
import type { Redis } from "ioredis";

const logger = createLogger("pages:ws:page-update:append-to-stream");

const MAX_STREAM_LEN = 50_000;

export type AppendResult =
  | { status: "ok"; streamId: string }
  | { status: "duplicate" };

export async function appendToStream(
  pageId: string,
  userId: string,
  update: string,
  dedupeId: string,
  redis: Redis
): Promise<AppendResult> {
  const streamKey = PageKeys.PageStream(pageId);
  const dedupeKey = PageKeys.PageDedupe(pageId, dedupeId);

  // Redis eval returns Lua integers as JS numbers (not strings).
  // ok=1 (number) means success; ok=0 (number) means duplicate/backpressure.
  const [ok, streamId, status] = (await redis.eval(
    ATOMIC_PAGE_UPDATE_SCRIPT,
    2,
    streamKey,
    dedupeKey,
    String(PageTTLs.DEDUPE),
    update,
    pageId,
    userId,
    dedupeId,
    String(MAX_STREAM_LEN)
  )) as [number, string, string];

  if (ok !== 1) {
    if (status === "duplicate") {
      logger.debug("Duplicate update — already in stream", {
        dedupeId,
        pageId,
      });
      return { status: "duplicate" };
    }

    if (status === "backpressure") {
      logger.warn("Stream backpressure limit reached", {
        pageId,
        maxLen: MAX_STREAM_LEN,
      });
      throw new AppError(
        `Page stream is full (${MAX_STREAM_LEN} entries). Snapshot compaction in progress.`,
        "RATE_LIMIT_EXCEEDED"
      );
    }

    throw new AppError(
      `Unexpected Lua result: ${status}`,
      "INTERNAL_SERVER_ERROR"
    );
  }

  logger.info("Update appended to stream", {
    pageId,
    streamId,
    dedupeId,
  });

  return { status: "ok", streamId };
}
