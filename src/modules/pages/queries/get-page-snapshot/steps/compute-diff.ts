/**
 * Step 5 — Compute Diff
 *
 * Computes the bandwidth-optimised server→client Yjs diff.
 *
 * If clientSnapshot is provided: derive its state vector → encode only the
 * delta the client is missing (not the full doc state).
 * If no clientSnapshot: encode the full current state (fresh open).
 *
 * IMPORTANT: This function destroys tempDoc. It must be the LAST step to use it.
 * Caller must not use tempDoc after this returns.
 */

import { Y } from "@/shared/yjs";
import { createLogger } from "@/shared/lib/logger";
import { safeApplyPageUpdate } from "../../../infra/safe-apply-update";

const logger = createLogger("pages:queries:get-page-snapshot:compute-diff");

export function computeDiff(
  clientSnapshot: string | undefined,
  pageId: string,
  tempDoc: Y.Doc
): string {
  let clientStateVector: Uint8Array | undefined;

  if (clientSnapshot) {
    const vecDoc = new Y.Doc({ guid: pageId });
    try {
      const result = safeApplyPageUpdate(
        vecDoc,
        Buffer.from(clientSnapshot, "base64"),
        {
          context: "server:state-vector-derivation",
          pageId,
          throwOnError: false,
        },
        logger
      );
      if (result.success) {
        clientStateVector = Y.encodeStateVector(vecDoc);
      }
      // Else: invalid client snapshot → fall back to full state (clientStateVector stays undefined)
    } finally {
      vecDoc.destroy();
    }
  }

  const diff = Y.encodeStateAsUpdate(tempDoc, clientStateVector);
  tempDoc.destroy(); // Must destroy — tempDoc holds Y.js observers and memory

  return Buffer.from(diff).toString("base64");
}
