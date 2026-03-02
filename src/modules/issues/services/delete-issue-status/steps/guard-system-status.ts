/** Throws FORBIDDEN if status is a system-created status (cannot be deleted). */
import { AppError } from "@/shared/errors";

export function guardSystemStatus(isSystem: boolean): void {
  if (isSystem) throw AppError.forbidden("System statuses cannot be deleted.");
}
