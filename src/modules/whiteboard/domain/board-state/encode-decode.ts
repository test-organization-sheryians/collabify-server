import { Y } from "@/shared/yjs";
import { logger } from "@/shared/logger";

/**
 * Y.Doc Encoding/Decoding Helpers (V4 Architecture)
 *
 *  **Purpose:** Convert between Y.js binary and Base64 for WebSocket transport
 */

const MAX_UPDATE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Validate Y.Doc update binary
 *
 * **Checks:** Valid Uint8Array, size limits, Y.js parseable
 */
export const validateYDocUpdate = (binary: Uint8Array): boolean => {
  if (!(binary instanceof Uint8Array)) {
    return false;
  }

  if (binary.length === 0 || binary.length > MAX_UPDATE_SIZE) {
    return false;
  }

  // Attempt to parse with Y.js
  try {
    const ydoc = new Y.Doc();
    Y.applyUpdate(ydoc, binary);
    return true;
  } catch (error) {
    logger.warn({ error, size: binary.length }, "Invalid Y.Doc update");
    return false;
  }
};

/**
 * Encode Y.Doc to Base64 string
 *
 * **Use Case:** Send over WebSocket (JSON transport)
 */
export const encodeYDocToBase64 = (binary: Uint8Array): string => {
  return Buffer.from(binary).toString("base64");
};

/**
 * Decode Base64 string to Y.Doc binary
 *
 * **Use Case:** Receive from WebSocket
 */
export const decodeBase64ToYDoc = (base64: string): Uint8Array => {
  return new Uint8Array(Buffer.from(base64, "base64"));
};

/**
 * Count elements in Y.Doc
 *
 * **Note:** Generic implementation - counts all top-level Y types
 * **For Excalidraw:** Would inspect `ydoc.getArray('elements').length`
 */
export const countYDocElements = (binary: Uint8Array): number => {
  try {
    const ydoc = new Y.Doc();
    Y.applyUpdate(ydoc, binary);

    // Count all top-level shared types
    let count = 0;
    ydoc.share.forEach((value) => {
      if (value instanceof Y.Array) {
        count += value.length;
      } else if (value instanceof Y.Map) {
        count += value.size;
      }
    });

    return count;
  } catch (error) {
    logger.error({ error }, "Failed to count Y.Doc elements");
    return 0;
  }
};
