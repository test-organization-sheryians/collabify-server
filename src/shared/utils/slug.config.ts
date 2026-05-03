/**
 * Single source of truth for all slug validation rules across the server.
 * Import MIN_SLUG_LENGTH, MAX_SLUG_LENGTH, and SLUG_REGEX everywhere slug
 * validation is needed. Never copy-paste the regex or magic numbers.
 */

export const MIN_SLUG_LENGTH = 3;
export const MAX_SLUG_LENGTH = 64;

/**
 * Regex: lowercase alphanumeric + hyphens, must start with alphanumeric,
 * cannot be purely numeric. Hyphens may not appear at either end or consecutively.
 */
export const SLUG_REGEX = /^(?![0-9]+$)[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * The absolute max slug length enforced at the DB column level.
 * PostgreSQL TEXT has no inherent limit — this is enforced via Zod + application
 * constraints. Keep in sync with MAX_SLUG_LENGTH above.
 */
export const DB_SLUG_MAX_BYTES = 255; // reasonable column headroom; no migration needed
