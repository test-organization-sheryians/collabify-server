/**
 * Safe Y.js Update Application with Validation (Server)
 *
 * Wraps Y.applyUpdate with comprehensive error handling, state validation,
 * and structured logging to detect and trace update failures.
 */

import { Y } from "@/shared/yjs";
import type { Logger } from "@/shared/lib/logger";

/**
 * Result of applying a Y.js update
 */
export interface SafeApplyUpdateResult {
  /** Whether the update was applied successfully */
  success: boolean;
  /** Error if update failed */
  error?: Error;
  /** Number of elements before update */
  elementsBefore?: number;
  /** Number of elements after update */
  elementsAfter?: number;
  /** Change in element count (after - before) */
  elementsDelta?: number;
}

/**
 * Options for safely applying Y.js updates
 */
export interface SafeApplyUpdateOptions {
  /** Context identifier for logging (e.g., "server:delta-updates", "server:state-sync") */
  context: string;
  /** Board ID for logging */
  boardId: string;
  /** Y.js origin marker (optional) */
  origin?: any;
  /** Whether to throw error on failure (default: false for server) */
  throwOnError?: boolean;
  /** Stream ID for logging (optional) */
  streamId?: string;
}

/**
 * Safely apply a Y.js update with validation and logging
 *
 * Features:
 * - Captures before/after state (Y.Array 'elements' length)
 * - Detects silent failures (update applied but no state change)
 * - Structured error handling with context
 * - Comprehensive logging (error/warn/info)
 *
 * @param ydoc - Y.Doc instance to apply update to
 * @param update - Binary update to apply
 * @param options - Configuration options
 * @param logger - Logger instance for structured logging
 * @returns Result object with success status and metrics
 */
export function safeApplyUpdate(
  ydoc: Y.Doc,
  update: Uint8Array,
  options: SafeApplyUpdateOptions,
  logger: Logger
): SafeApplyUpdateResult {
  const { context, boardId, origin, throwOnError = false, streamId } = options;

  // Capture before state
  let elementsBefore: number | undefined;
  try {
    const yElements = ydoc.getArray("elements");
    elementsBefore = yElements.length;
  } catch (error) {
    logger.warn("Could not read Y.Array before update", {
      context,
      boardId,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Apply update with error handling
  try {
    Y.applyUpdate(ydoc, update, origin);

    // Capture after state
    let elementsAfter: number | undefined;
    let elementsDelta: number | undefined;
    try {
      const yElements = ydoc.getArray("elements");
      elementsAfter = yElements.length;
      if (elementsBefore !== undefined) {
        elementsDelta = elementsAfter - elementsBefore;
      }
    } catch (error) {
      logger.warn("Could not read Y.Array after update", {
        context,
        boardId,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // Detect silent failure (update applied but no state change)
    if (
      update.length > 0 &&
      elementsBefore !== undefined &&
      elementsAfter !== undefined &&
      elementsBefore === elementsAfter
    ) {
      logger.warn("⚠️  Update applied but no state change detected", {
        context,
        boardId,
        streamId,
        updateSize: update.length,
        elementCount: elementsAfter,
      });
    } else {
      // Success with state change
      logger.info("✅ Y.js update applied successfully", {
        context,
        boardId,
        streamId,
        updateSize: update.length,
        elementsBefore,
        elementsAfter,
        elementsDelta,
      });
    }

    return {
      success: true,
      elementsBefore,
      elementsAfter,
      elementsDelta,
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));

    logger.error("❌ Failed to apply Y.js update", {
      context,
      boardId,
      streamId,
      updateSize: update.length,
      error: err.message,
      errorStack: err.stack,
    });

    if (throwOnError) {
      throw err;
    }

    return {
      success: false,
      error: err,
      elementsBefore,
    };
  }
}
