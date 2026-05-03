/**
 * Step 3 — Validate Update
 *
 * Decodes and validates the base64-encoded Yjs binary delta.
 * Returns the decoded Buffer for downstream use.
 *
 * Synchronous — no I/O. Pure guard function.
 *
 * WHY NO STRUCTURAL YJS VALIDATION:
 * validatePageUpdate() checks base64 + size only, not Yjs binary structure.
 * Structural validation (Y.applyUpdate) is too expensive for the hot path.
 * It happens in the stream worker when the update is consumed.
 */

import { AppError } from "@/shared/errors";
import { validatePageUpdate } from "../../../../infra/page-validator";

export function validateUpdate(update: string): Buffer {
  const result = validatePageUpdate(update);

  if (!result.ok) {
    switch (result.reason) {
      case "empty":
        throw new AppError("Update payload is empty", "INVALID_UPDATE");
      case "invalid-base64":
        throw new AppError(
          "Update must be valid Base64-encoded binary",
          "INVALID_ENCODING"
        );
      case "too-large":
        throw new AppError(
          "Update size exceeds the 5MB maximum. Send images via the file upload API.",
          "UPDATE_TOO_LARGE"
        );
    }
  }

  return result.binary;
}
