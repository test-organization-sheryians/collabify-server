/**
 * Normalize, lowercase and validate the project slug.
 * Throws CONFLICT if the slug matches a reserved keyword.
 */
import { AppError } from "@/shared/errors";
import { SlugUtil } from "@/shared/utils/slug.util";

const RESERVED_PROJECT_KEYS = [
  "settings",
  "admin",
  "api",
  "billing",
  "support",
];

export function normalizeAndValidateSlug(
  rawSlug: string,
  name: string
): string {
  const slug = (rawSlug || SlugUtil.sanitize(name)).toLowerCase();

  if (RESERVED_PROJECT_KEYS.includes(slug)) {
    throw AppError.conflict(
      `Project key '${slug}' is a reserved system keyword.`,
      "PROJECT_SLUG_TAKEN_RESERVED"
    );
  }

  return slug;
}
