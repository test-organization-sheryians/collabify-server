/** Guards: sizeBytes must not exceed the 2 MB limit. */
import { AppError } from "@/shared/errors";
import { ISSUE_LIMITS } from "../../../lib/constants";

export function validateSize(sizeBytes: number): void {
  if (sizeBytes > ISSUE_LIMITS.MAX_DESCRIPTION_SIZE_BYTES) {
    throw AppError.badRequest("Description exceeds the 2 MB limit.");
  }
}
