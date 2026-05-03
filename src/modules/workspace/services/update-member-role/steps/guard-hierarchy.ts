/**
 * guardHierarchy — enforces rank-based privilege rules for role changes.
 *
 * Rules:
 *   1. Actor rank must be strictly greater than target's current rank (can only manage lower roles)
 *   2. Actor rank must be strictly greater than the new role's rank (no privilege escalation)
 */
import { AppError } from "@/shared/errors";

export function guardHierarchy(
  actorRank: number,
  targetCurrentRank: number,
  newRoleRank: number
): void {
  if (actorRank <= targetCurrentRank) {
    throw AppError.forbidden(
      "You cannot change the role of a member with equal or higher rank than yours."
    );
  }

  if (actorRank <= newRoleRank) {
    throw AppError.forbidden(
      "You cannot assign a role with equal or higher rank than your own."
    );
  }
}
