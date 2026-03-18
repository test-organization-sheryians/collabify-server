/**
 * Step: Init Page Content
 *
 * Three sub-steps that must happen in order after the DB row is committed:
 * 6. Create an empty Y.Doc with the page ID as its GUID
 * 7. Upload initial snapshot to S3
 * 8. Update the page row with s3Key + snapshot metadata
 *
 * WHY OUTSIDE THE TRANSACTION:
 * Holding a Prisma transaction open during S3 network I/O blocks a DB connection
 * for the entire upload duration. At scale this exhausts the connection pool.
 * We commit the page row first (s3Key=null), then upload, then update.
 *
 * FAILURE HANDLING:
 * If the S3 upload fails, throw so handler.ts runs the compensating page.delete.
 * Do NOT throw AppError here — the outer handler catches AppError and skips delete.
 */

import { createLogger } from "@/shared/lib/logger";
import type { ServiceContext } from "@/graphql/types";
import { uploadPageSnapshot } from "../../../infra/page-storage";
import { PageS3Keys } from "../../../infra/page-keys";
import { Y } from "@/shared/yjs";

const logger = createLogger("pages:services:create-page");

export async function initPageContent(
  pageId: string,
  title: string,
  ctx: ServiceContext
): Promise<void> {
  // Step 6 — Initialize empty Y.Doc
  // GUID = pageId: deterministic, globally unique — required for CRDT correctness.
  // Any process that reconstructs this doc (stream worker, getPageSnapshot) will
  // get a compatible CRDT as long as it uses the same GUID.
  const doc = new Y.Doc({ guid: pageId });

  // Initialize shared types and encode — wrapped in try/finally so doc.destroy()
  // always runs. Y.Doc holds internal event listeners and CRDT state; without
  // destroy() every createPage call leaks memory proportional to doc size.
  let state: Uint8Array;
  try {
    doc.getXmlFragment("content"); // TipTap Collaboration.configure({ field: "content" })
    const meta = doc.getMap("meta"); // synced title/icon/cover metadata
    meta.set("title", title); // seed with initial title
    doc.getMap("config"); // one-shot init guard (initialContentLoaded flag)
    state = Y.encodeStateAsUpdate(doc);
  } finally {
    doc.destroy();
  }

  // Step 7 — Upload initial snapshot to S3
  // Throw a plain Error (NOT AppError) so handler.ts compensating delete runs.
  try {
    await uploadPageSnapshot(pageId, Buffer.from(state));
  } catch (s3Err) {
    logger.error("S3 snapshot upload failed — triggering compensating delete", {
      pageId,
      err: s3Err,
    });
    // Re-throw as plain Error so the outer catch skips the AppError branch
    // and runs the compensating page.delete instead.
    throw new Error("S3 upload failed for new page");
  }

  // Step 8 — Write s3Key + snapshot metadata back to the page row
  await ctx.db.page.update({
    where: { id: pageId },
    data: {
      s3Key: PageS3Keys.LatestSnapshot(pageId),
      lastSnapshotStreamId: "0-0",
      lastSnapshotAt: new Date(),
    },
  });
}
