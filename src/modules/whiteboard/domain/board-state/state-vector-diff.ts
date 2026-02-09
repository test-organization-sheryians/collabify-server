import { Y } from "@/shared/yjs";
import { logger } from "@/shared/logger";

/**
 * State Vector Diff Calculator (V4 Architecture)
 *
 * **Purpose:** Compute minimal diff between client and server state
 * **Use Case:** `board:subscribe` - send only missing updates
 */

/**
 * Compute diff between server state and client state
 *
 * **Pattern:** Server full state - Client state vector → Minimal update
 * **Benefit:** Reduces network payload (only send delta)
 *
 * @param serverState - Current server Y.Doc state
 * @param clientStateVector - Client's state vector (Base64 encoded)
 * @returns Minimal update needed to sync client (Uint8Array)
 */
export const computeStateVectorDiff = (
  serverState: Uint8Array,
  clientStateVector: string
): Uint8Array => {
  const ydoc = new Y.Doc();

  try {
    // Apply server state
    Y.applyUpdate(ydoc, serverState);
  } catch (error) {
    logger.error({ error }, "Invalid server state");
    throw new Error("Failed to apply server state");
  }

  try {
    // Decode client state vector
    const clientVectorBytes = Buffer.from(clientStateVector, "base64");

    // Compute diff: only what client is missing
    return Y.encodeStateAsUpdate(ydoc, clientVectorBytes);
  } catch (error) {
    // Fallback: send full state if state vector invalid
    logger.warn({ error }, "Invalid client state vector, sending full state");
    return Y.encodeStateAsUpdate(ydoc);
  }
};

/**
 * Encode state vector from Y.Doc
 *
 * **State Vector:** Compact representation of "what updates I have"
 */
export function encodeStateVector(ydoc: Y.Doc): Uint8Array {
  try {
    return Y.encodeStateVector(ydoc);
  } catch (error) {
    logger.error({ error }, "Failed to encode state vector");
    throw new Error("Failed to encode state vector");
  }
}

/**
 * Check if client is up-to-date
 *
 * **Logic:** If diff is empty, client has all updates
 */
export function isClientUpToDate(
  serverDoc: Y.Doc,
  clientStateVector: Uint8Array
): boolean {
  const diff = Y.encodeStateAsUpdate(serverDoc, clientStateVector);
  return diff.length === 0;
}
