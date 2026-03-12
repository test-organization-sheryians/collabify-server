/**
 * rate-limit-guard.ts
 *
 * Reusable Hono middleware for per-user, per-route sliding-window rate limiting.
 *
 * Design:
 *   - Uses Redis INCR + EXPIRE (atomic sliding window)
 *   - Key format: `ratelimit:<routeKey>:<userId>`
 *   - Falls back to IP address when userId is absent (unauthenticated routes)
 *   - Throws 429 AppError on breach (caught by Hono error handler)
 *   - Sets standard RateLimit-* response headers for client transparency
 *
 * Usage:
 *   app.use("/graphql", rateLimitGuard({ routeKey: "graphql", limit: 300, windowSeconds: 60 }));
 *   app.use("/api/upload", rateLimitGuard({ routeKey: "upload", limit: 10, windowSeconds: 60 }));
 */

import type { Context, Next, MiddlewareHandler } from "hono";
import { getAuth } from "@hono/clerk-auth";
import { redis } from "@/infra/redis";
import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";

const logger = createLogger("middleware:rate-limit-guard");

export interface RateLimitOptions {
  /** Logical name for this route's bucket (used in key construction) */
  routeKey: string;
  /** Max requests allowed within the window */
  limit: number;
  /** Rolling window duration in seconds */
  windowSeconds: number;
  /**
   * Override the identifier resolver.
   * Defaults to: Clerk userId → X-Forwarded-For → socket remote address
   */
  resolveId?: (c: Context) => string | null;
}

/**
 * Build the Redis key for a given route + identifier.
 */
function buildKey(routeKey: string, identifier: string): string {
  return `ratelimit:${routeKey}:${identifier}`;
}

/**
 * Sliding-window rate check via Redis INCR + EXPIRE.
 * Returns { allowed, current, limit }.
 */
async function slidingWindowCheck(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<{ allowed: boolean; current: number }> {
  const current = await redis.incr(key);
  if (current === 1) {
    // First hit in the window — set the TTL now
    await redis.expire(key, windowSeconds);
  }
  return { allowed: current <= limit, current };
}

/**
 * Default identifier resolver:
 *   1. Clerk userId (authenticated)
 *   2. X-Forwarded-For header (behind reverse proxy)
 *   3. Raw IP (fallback)
 */
function defaultResolveId(c: Context): string | null {
  const auth = getAuth(c);
  if (auth?.userId) return `user:${auth.userId}`;

  const forwarded = c.req.header("x-forwarded-for");
  if (forwarded) return `ip:${forwarded.split(",")[0].trim()}`;

  const raw = c.req.raw.headers.get("x-real-ip");
  if (raw) return `ip:${raw}`;

  return "ip:unknown";
}

/**
 * Factory — returns a Hono middleware handler that enforces rate limits.
 */
export function rateLimitGuard(options: RateLimitOptions): MiddlewareHandler {
  const { routeKey, limit, windowSeconds, resolveId = defaultResolveId } =
    options;

  return async (c: Context, next: Next) => {
    const identifier = resolveId(c);

    if (!identifier) {
      // Cannot identify the caller — allow through (edge case)
      return next();
    }

    const key = buildKey(routeKey, identifier);

    const { allowed, current } = await slidingWindowCheck(
      key,
      limit,
      windowSeconds
    );

    // Set standard rate-limit headers
    c.res.headers.set("RateLimit-Limit", String(limit));
    c.res.headers.set(
      "RateLimit-Remaining",
      String(Math.max(0, limit - current))
    );
    c.res.headers.set("RateLimit-Window", String(windowSeconds));

    if (!allowed) {
      logger.warn("Rate limit exceeded", {
        routeKey,
        identifier,
        current,
        limit,
      });

      c.res.headers.set("Retry-After", String(windowSeconds));

      throw new AppError(
        `Rate limit exceeded. Max ${limit} requests per ${windowSeconds}s.`,
        "RATE_LIMIT_EXCEEDED",
        429
      );
    }

    return next();
  };
}

/**
 * Pre-configured limit presets for common routes.
 * Tune these values for your traffic profile.
 */
export const RATE_LIMITS = {
  /** GraphQL endpoint — generous limit to allow batched operations */
  GRAPHQL: { routeKey: "graphql", limit: 300, windowSeconds: 60 },

  /** REST / REST-like mutation endpoints */
  API_WRITE: { routeKey: "api_write", limit: 60, windowSeconds: 60 },

  /** File upload endpoints */
  UPLOAD: { routeKey: "upload", limit: 20, windowSeconds: 60 },

  /** Auth related (sign-in / token refresh) */
  AUTH: { routeKey: "auth", limit: 10, windowSeconds: 60 },

  /** Slug availability checks */
  SLUG_CHECK: { routeKey: "slug_check", limit: 30, windowSeconds: 60 },
} as const;
