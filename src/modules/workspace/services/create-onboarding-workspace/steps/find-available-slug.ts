/**
 * Find an available slug for the onboarding workspace.
 *
 * Strategy:
 *   - If a custom slug is provided, try it first (fail fast if taken).
 *   - Otherwise, generate suffixed variants from the user's name (up to 5 retries).
 * Each attempt also RESERVES the slug via checkSlugAvailability.
 */
import { AppError } from "@/shared/errors";
import { SlugUtil } from "@/shared/utils/slug.util";
import { checkSlugAvailability } from "../../check-slug-availability";
import type { ServiceContext } from "@/graphql/types";

const MAX_RETRIES = 5;

export async function findAvailableSlug(
  userId: string,
  userFullName: string,
  customSlug: string | undefined,
  ctx: ServiceContext
): Promise<string> {
  const baseSlug = customSlug || SlugUtil.sanitize(userFullName) || "workspace";
  let attempts = 0;

  while (attempts < MAX_RETRIES) {
    const candidateSlug =
      customSlug && attempts === 0
        ? customSlug
        : SlugUtil.generateNext(baseSlug, attempts);

    const check = await checkSlugAvailability(
      { slug: candidateSlug, userId },
      ctx
    );

    if (check.available) return candidateSlug;

    // Custom slug failed on first try — fail fast (no suffix fallback for explicit input)
    if (customSlug && attempts === 0) {
      throw AppError.conflict(
        `The slug '${customSlug}' is unavailable. Please choose another.`,
        "WORKSPACE_ONBOARDING_CUSTOM_SLUG_TAKEN"
      );
    }

    attempts++;
  }

  throw new AppError(
    "Could not generate a unique workspace URL. Please try again.",
    "WORKSPACE_ONBOARDING_SLUG_GENERATION_FAILED"
  );
}
