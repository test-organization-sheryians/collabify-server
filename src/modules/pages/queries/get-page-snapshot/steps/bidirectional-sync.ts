/**
 * Step 4 — Bidirectional Sync
 *
 * If the client provides their current Y.Doc snapshot, we:
 *   1. Compute what client has that server doesn't (offline edits)
 *   2. Apply those edits to tempDoc (mutated in place)
 *   3. Write to Redis stream via CLIENT_SYNC_SCRIPT (atomic dedup + XADD)
 *   4. Broadcast to all subscribers via Pub/Sub
 *
 * This is what allows offline edits to propagate to other devices at reconnect.
 *
 * CLIENT_SYNC_SCRIPT returns a FLAT ARRAY [ok, streamId, status]:
 *   ok     = '1' (success) | '0' (failure)
 *   status = 'ok' | 'duplicate' | 'backpressure'
 * NOT a JSON string like the whiteboard version — parse accordingly.
 *
 * originSocketId: null in the Pub/Sub envelope means broadcast to ALL sockets
 * (including the sender's other devices). This is intentional — unlike
 * page-update which skips the originating socket.
 */

import { Y } from "@/shared/yjs";
import { createLogger } from "@/shared/lib/logger";
import { safeApplyPageUpdate } from "../../../infra/safe-apply-update";
import { createSuccessFrame } from "@/infra/ws/types";
import { PageKeys, PageTTLs } from "../../../infra/page-keys";
import { CLIENT_SYNC_SCRIPT } from "../../../infra/lua/client-sync";
import type { ServiceContext } from "@/graphql/types";

const logger = createLogger(
  "pages:queries:get-page-snapshot:bidirectional-sync"
);

const MAX_STREAM_LEN = 50_000;

export async function bidirectionalSync(
  pageId: string,
  clientSnapshot: string,
  userId: string,
  tempDoc: Y.Doc,
  ctx: ServiceContext
): Promise<void> {
  // Build client Y.Doc from their snapshot
  const clientDoc = new Y.Doc({ guid: pageId });
  try {
    Y.applyUpdate(clientDoc, Buffer.from(clientSnapshot, "base64"));

    // What does client have that server doesn't?
    const serverVector = Y.encodeStateVector(tempDoc);
    const clientToServerDiff = Y.encodeStateAsUpdate(clientDoc, serverVector);

    if (clientToServerDiff.length === 0) {
      logger.info("Client already in sync with server", { pageId, userId });
      return;
    }

    logger.info("Client has offline edits", {
      pageId,
      userId,
      diffBytes: clientToServerDiff.length,
    });

    // Apply client's offline edits to server's tempDoc
    const applyResult = safeApplyPageUpdate(
      tempDoc,
      clientToServerDiff,
      {
        context: "server:client-offline-updates",
        pageId,
        throwOnError: true,
      },
      logger
    );

    if (!applyResult.success) {
      logger.error(
        "Failed to apply client offline edits — skipping stream write",
        {
          pageId,
          userId,
        }
      );
      return;
    }

    // Write to stream atomically (dedup + XADD)
    const dedupeId = `client-sync-${userId}-${Date.now()}`;
    const base64Diff = Buffer.from(clientToServerDiff).toString("base64");

    // CLIENT_SYNC_SCRIPT KEYS/ARGV:
    //   KEYS[1] = page:{pageId}:stream
    //   KEYS[2] = page:{pageId}:dedupe:{dedupeId}
    //   ARGV[1] = dedupeTtl, [2] = update(b64), [3] = pageId,
    //   ARGV[4] = userId,    [5] = dedupeId,    [6] = maxStreamLen
    const [ok, streamId, status] = (await ctx.redis.eval(
      CLIENT_SYNC_SCRIPT,
      2,
      PageKeys.PageStream(pageId),
      PageKeys.PageDedupe(pageId, dedupeId),
      PageTTLs.DEDUPE.toString(),
      base64Diff,
      pageId,
      userId,
      dedupeId,
      MAX_STREAM_LEN.toString()
    )) as [string, string, string];

    if (ok !== "1") {
      logger.warn("Client sync not written to stream", {
        pageId,
        userId,
        status,
      });
      return;
    }

    // Broadcast to all subscribers (including sender's other devices)
    const frame = createSuccessFrame(undefined, "page:page-update", {
      pageId,
      streamId,
      update: base64Diff,
      userId,
      timestamp: Date.now().toString(),
    });

    await ctx.redis.publish(
      PageKeys.PageEvents(pageId),
      JSON.stringify({
        message: frame,
        originSocketId: null, // null = broadcast ALL (offline edit must reach all devices)
      })
    );

    logger.info("Offline edits written to stream + broadcast", {
      pageId,
      userId,
      streamId,
      diffBytes: clientToServerDiff.length,
    });
  } finally {
    clientDoc.destroy();
  }
}
