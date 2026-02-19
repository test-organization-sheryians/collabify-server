/**
 * Page Validator — Centralised guard for all raw Yjs binary updates.
 *
 * RULE: Every handler that touches a raw base64 Yjs byte string MUST
 * call validatePageUpdate() before passing data deeper into the system.
 * No inline Buffer.from() + size checks in handlers.
 */

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * 5MB hard limit per update.
 *
 * Rationale: A Y.XmlFragment update for a 100-page document is ~200KB in practice.
 * 5MB gives headroom for large pastes while blocking obviously malformed payloads.
 * Images pasted as base64 inline should be handled via a separate file upload flow,
 * not embedded directly in Yjs updates.
 */
const MAX_UPDATE_BYTES = 5 * 1024 * 1024;

// ─── Types ────────────────────────────────────────────────────────────────────

export type ValidationFailureReason = "empty" | "invalid-base64" | "too-large";

export type PageUpdateValidationResult =
  | { ok: true; binary: Buffer }
  | { ok: false; reason: ValidationFailureReason };

// ─── Validator ────────────────────────────────────────────────────────────────

/**
 * Validates a raw base64-encoded Yjs update before it enters the hot path.
 *
 * NOTE: This does NOT validate Yjs binary structure (no Y.applyUpdate call).
 * Structural validation happens implicitly when the stream worker applies
 * updates to a Y.Doc — malformed updates are caught and logged there.
 * Validating structure here would be too expensive for the hot path.
 *
 * @param encoded - base64 string received from the client
 */
export function validatePageUpdate(
  encoded: string
): PageUpdateValidationResult {
  // TODO: Step 1 — check for empty/falsy input
  // if (!encoded) return { ok: false, reason: 'empty' }

  // TODO: Step 2 — decode base64 safely
  // let binary: Buffer
  // try {
  //   binary = Buffer.from(encoded, 'base64')
  // } catch {
  //   return { ok: false, reason: 'invalid-base64' }
  // }

  // TODO: Step 3 — check decoded length is non-zero
  // if (binary.length === 0) return { ok: false, reason: 'empty' }

  // TODO: Step 4 — enforce size limit
  // if (binary.length > MAX_UPDATE_BYTES) return { ok: false, reason: 'too-large' }

  // TODO: Step 5 — return success with decoded buffer
  // return { ok: true, binary }

  throw new Error("validatePageUpdate: not implemented");
}
