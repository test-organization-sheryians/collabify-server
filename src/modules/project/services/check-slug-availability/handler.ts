/**
 * checkSlugAvailability (Project) — Service Handler (thin orchestrator)
 *
 * Steps:
 *   1. enforceRateLimit — 429 if > 15 checks in 60s
 *   2. checkSlugDb      — hard DB check
 *   3. reserveSlug      — rolling Redis reservation
 *
 * Infra imports removed — uses ctx.db / ctx.redis.
 */
import { SlugUtil } from "@/shared/utils/slug.util";
import type { ServiceContext } from "@/graphql/types";
import type { CheckSlugAvailabilityInput } from "./types";
import { enforceRateLimit } from "./steps/enforce-rate-limit";
import { checkSlugDb } from "./steps/check-slug-db";
import { reserveSlug } from "./steps/reserve-slug";

export const checkSlugAvailability = async (
  input: CheckSlugAvailabilityInput,
  ctx: ServiceContext
) => {
  const { workspaceId, slug, userId } = input;
  const { db, redis } = ctx;
  const normalizedSlug = SlugUtil.sanitize(slug).toLowerCase();

  const rateLimitResult = await enforceRateLimit(workspaceId, userId, redis);
  if (rateLimitResult) return rateLimitResult;

  if (await checkSlugDb(workspaceId, normalizedSlug, db)) {
    return {
      available: false,
      message: "Project with this key already exists",
      reason: "PROJECT_SLUG_TAKEN_PERMANENT",
    };
  }

  return reserveSlug(workspaceId, normalizedSlug, userId, redis);
};
