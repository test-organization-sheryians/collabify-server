/**
 * Page Validator — Centralised guard for all raw Yjs binary updates.
 *
 * RULE: Every handler that touches a raw base64 Yjs byte string MUST
 * call validatePageUpdate() before passing data deeper into the system.
 * No inline Buffer.from() + size checks in handlers.
 */

/** 5MB hard limit per update. Images should go through the file upload flow. */
const MAX_UPDATE_BYTES = 5 * 1024 * 1024;

export type ValidationFailureReason = "empty" | "invalid-base64" | "too-large";

export type PageUpdateValidationResult =
  | { ok: true; binary: Buffer }
  | { ok: false; reason: ValidationFailureReason };

/**
 * Validates a raw base64-encoded Yjs update before it enters the hot path.
 *
 * NOTE: Does NOT validate Yjs binary structure (no Y.applyUpdate call here).
 * Structural validation happens in the stream worker when updates are applied.
 * Doing it here would be too expensive for the hot path.
 */
export function validatePageUpdate(
  encoded: string
): PageUpdateValidationResult {
  if (!encoded) return { ok: false, reason: "empty" };

  let binary: Buffer;
  try {
    binary = Buffer.from(encoded, "base64");
  } catch {
    return { ok: false, reason: "invalid-base64" };
  }

  if (binary.length === 0) return { ok: false, reason: "empty" };
  if (binary.length > MAX_UPDATE_BYTES)
    return { ok: false, reason: "too-large" };

  return { ok: true, binary };
}
