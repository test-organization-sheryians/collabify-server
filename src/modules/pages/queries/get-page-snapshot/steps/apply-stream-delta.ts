/**
 * Step 3 — Apply Stream Delta
 *
 * Closes the gap between the last compacted snapshot and the current stream head.
 * The stream worker compacts after ~50 updates. Between compactions, new XADD
 * entries accumulate that aren't reflected in the snapshot yet. This step merges
 * them before computing the diff for the client.
 *
 * Performance: COUNT 5000 cap prevents OOM on pages with very large backlogs.
 * Failures per entry: non-fatal (logged, skipped) — one corrupt entry won't block others.
 *
 * IMPORTANT: Caller must NOT destroy tempDoc — it is returned for use in
 * Step 4 of the handler (Y.encodeStateAsUpdate). handler.ts destroys it
 * in a try/finally block after encoding.
 */

import { Y } from "@/shared/yjs";
import { createLogger } from "@/shared/lib/logger";
import { safeApplyPageUpdate } from "../../../infra/safe-apply-update";
import { PageKeys } from "../../../infra/page-keys";
import type { ServiceContext } from "@/graphql/types";

const logger = createLogger(
  "pages:queries:get-page-snapshot:apply-stream-delta"
);

export async function applyStreamDelta(
  pageId: string,
  snapshotBinary: Buffer,
  snapshotStreamId: string,
  ctx: ServiceContext
): Promise<{ tempDoc: Y.Doc; lastStreamId: string }> {
  const tempDoc = new Y.Doc({ guid: pageId }); // DETERMINISTIC GUID
  // origin 'server:snapshot' marks this as the base state load
  Y.applyUpdate(tempDoc, new Uint8Array(snapshotBinary), "server:snapshot");

  const newerUpdates = (await ctx.redis.xrange(
    PageKeys.PageStream(pageId),
    `(${snapshotStreamId}`, // exclusive: start AFTER the snapshot's last entry
    "+",
    "COUNT",
    5000
  )) as Array<[string, string[]]>;

  let lastStreamId = snapshotStreamId;

  for (const [id, fields] of newerUpdates) {
    const data = parseStreamFields(fields);
    if (!data.update) continue;

    const result = safeApplyPageUpdate(
      tempDoc,
      Buffer.from(data.update, "base64"),
      {
        context: "server:stream-delta",
        pageId,
        streamId: id,
        throwOnError: false,
      },
      logger
    );

    if (result.success) {
      lastStreamId = id;
    }
  }

  if (newerUpdates.length > 0) {
    logger.info("Stream delta applied", {
      pageId,
      base: snapshotStreamId,
      head: lastStreamId,
      count: newerUpdates.length,
    });
  }

  return { tempDoc, lastStreamId };
}

/** Parse Redis stream fields array ["key","val","key","val",...] into a plain object. */
function parseStreamFields(fields: string[]): Record<string, string> {
  const data: Record<string, string> = {};
  for (let i = 0; i < fields.length; i += 2) {
    data[fields[i]] = fields[i + 1];
  }
  return data;
}
