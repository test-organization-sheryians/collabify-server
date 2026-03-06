/**
 * checkSlugAvailability — Service Handler (thin orchestrator)
 *
 * Steps:
 *   1. enforceRateLimit      — 429 if too many checks
 *   2. checkSlugExistsCache  — soft Redis exists-cache check
 *   3. checkSlugLocked       — soft Redis lock check (someone else reserved it)
 *   4. checkSlugDb           — hard DB check
 *   5. reserveSlug           — rolling Redis reservation via LockingService.switch
 */
import { SlugUtil } from "@/shared/utils/slug.util";
import type { ServiceContext } from "@/graphql/types";
import { CheckAvailabilitySchema } from "./schema";
import type { z } from "zod";
import { enforceRateLimit } from "./steps/enforce-rate-limit";
import { checkSlugExistsCache } from "./steps/check-slug-exists-cache";
import { checkSlugLocked } from "./steps/check-slug-locked";
import { checkSlugDb } from "./steps/check-slug-db";
import { reserveSlug } from "./steps/reserve-slug";

type CheckAvailabilityInput = z.infer<typeof CheckAvailabilitySchema>;

export const checkSlugAvailability = async (
  input: CheckAvailabilityInput,
  ctx: ServiceContext
) => {
  const { slug, userId } = input;
  const { db, redis } = ctx;

  const normalizedSlug = SlugUtil.sanitize(slug);

  await enforceRateLimit(userId, redis);

  if (await checkSlugExistsCache(normalizedSlug, redis)) {
    return {
      available: false,
      message: "Workspace already exists",
      reason: "WORKSPACE_SLUG_TAKEN_PERMANENT",
    };
  }

  if (await checkSlugLocked(normalizedSlug, userId, redis)) {
    return {
      available: false,
      message: "Slug is currently reserved",
      reason: "WORKSPACE_SLUG_LOCKED",
    };
  }

  if (await checkSlugDb(normalizedSlug, db)) {
    return {
      available: false,
      message: "Workspace already exists",
      reason: "WORKSPACE_SLUG_TAKEN_PERMANENT",
    };
  }

  return reserveSlug(normalizedSlug, userId, redis);
};
