/**
 * Pages — Safe Yjs Update Application
 *
 * WHY NOT @/shared/lib/safe-apply-update:
 * That utility is built for whiteboards — it measures state change via
 * `Y.Array("elements").length` (Excalidraw's shared type).
 * Pages use `Y.XmlFragment("content")` (Tiptap). The shared function's
 * validation metric is meaningless for pages and generates misleading
 * "no state change" warnings on every update.
 *
 * This module is a drop-in replacement scoped to the pages module only.
 */

import { Y } from "@/shared/yjs";
import type { Logger } from "@/shared/lib/logger";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PageSafeApplyOptions {
  /** Context identifier for logging (e.g. "server:stream-delta") */
  context: string;
  /** Page ID for log correlation */
  pageId: string;
  /** Whether to throw on failure (default: false) */
  throwOnError?: boolean;
  /** Stream entry ID for log correlation (optional) */
  streamId?: string;
}

export interface PageSafeApplyResult {
  success: boolean;
  error?: Error;
  /** Y.XmlFragment("content").toString().length after the update */
  contentLength?: number;
}

// ─── Implementation ───────────────────────────────────────────────────────────

/**
 * Safely apply a Yjs binary update to a pages Y.Doc.
 *
 * - Measures state via `Y.XmlFragment("content")` (Tiptap shared type)
 * - Structured logging with pageId + streamId correlation
 * - throwOnError=false (non-fatal) by default for stream delta replay
 * - throwOnError=true for bidirectional sync (critical path)
 */
export function safeApplyPageUpdate(
  ydoc: Y.Doc,
  update: Uint8Array,
  options: PageSafeApplyOptions,
  logger: Logger
): PageSafeApplyResult {
  const { context, pageId, throwOnError = false, streamId } = options;

  // Measure content size before update (non-fatal if XmlFragment not yet initialised)
  let lengthBefore: number | undefined;
  try {
    lengthBefore = ydoc.getXmlFragment("content").toString().length;
  } catch {
    // XmlFragment may not exist yet on a fresh doc — acceptable
  }

  try {
    Y.applyUpdate(ydoc, update);

    let lengthAfter: number | undefined;
    try {
      lengthAfter = ydoc.getXmlFragment("content").toString().length;
    } catch {
      // Non-fatal
    }

    logger.info("Yjs update applied", {
      context,
      pageId,
      streamId,
      updateBytes: update.length,
      lengthBefore,
      lengthAfter,
    });

    return { success: true, contentLength: lengthAfter };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));

    logger.error("Failed to apply Yjs update", {
      context,
      pageId,
      streamId,
      updateBytes: update.length,
      error: err.message,
    });

    if (throwOnError) throw err;
    return { success: false, error: err };
  }
}
