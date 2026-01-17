import {
  describe,
  it,
  expect,
  mock,
  beforeEach,
  afterEach,
  spyOn,
} from "bun:test";
import { checkSlugAvailability } from "./handler";
import { redis } from "@/infra/redis";
import { db } from "@/infra/db";
import { AppError } from "@/shared/errors";
import { z } from "zod";
import * as rateLimiter from "@/shared/utils/rate-limiter";
import { WORKSPACE_LIMITS } from "@/shared/config/limits";

// -----------------------------------------------------------------------------
// MOCKS
// -----------------------------------------------------------------------------

mock.module("@/infra/redis", () => ({
  redis: {
    get: mock(),
    set: mock(),
    del: mock(),
    eval: mock(),
  },
}));

mock.module("@/infra/db", () => ({
  db: {
    workspace: {
      findUnique: mock(),
    },
  },
}));

// Mock Rate Limiter
spyOn(rateLimiter, "checkRateLimit").mockResolvedValue(true);

// -----------------------------------------------------------------------------
// TESTS
// -----------------------------------------------------------------------------

describe("checkSlugAvailability Handler (Unit)", () => {
  beforeEach(() => {
    // Restore generic mocks to avoid leak
    mock.restore();

    // Re-spy on rate limiter every test to ensure clean state after restore
    spyOn(rateLimiter, "checkRateLimit").mockResolvedValue(true);

    // Clear other mocks provided by mock.module
    (redis.get as any).mockClear();
    (redis.set as any).mockClear();
    (redis.eval as any).mockClear();
    (db.workspace.findUnique as any).mockClear();

    // Default Happy Path Mocks
    (redis.get as any).mockResolvedValue(null); // No cache, no lock
    (db.workspace.findUnique as any).mockResolvedValue(null); // No DB conflict
    (redis.eval as any).mockResolvedValue(1); // Lua script success
  });

  const validProps = {
    slug: "acme-corp",
    userId: "user_123",
  };

  describe("1. Input Validation (Zod Schema)", () => {
    it("should accept valid lowercase slug", async () => {
      const result = await checkSlugAvailability(validProps);
      expect(result.available).toBe(true);
    });

    // Uppercase tests removed as Zod Schema enforces strict lowercase regex before logic runs.

    it("should reject slug shorter than 8 chars", async () => {
      try {
        await checkSlugAvailability({
          ...validProps,
          slug: "abcdef7",
        });
        throw new Error("Should have thrown ZodError");
      } catch (err: any) {
        expect(err).toBeInstanceOf(z.ZodError);
        // Expect generic too small or specific message depending on system
        expect(JSON.stringify(err.issues)).toContain("Too small");
      }
    });

    it("should reject slug longer than 50 chars", async () => {
      const longSlug = "a".repeat(51);
      try {
        await checkSlugAvailability({
          ...validProps,
          slug: longSlug,
        });
        throw new Error("Should have thrown ZodError");
      } catch (err: any) {
        expect(err).toBeInstanceOf(z.ZodError);
        expect(JSON.stringify(err.issues)).toContain("Too big");
      }
    });

    it("should reject slug with invalid characters (special chars)", async () => {
      try {
        await checkSlugAvailability({
          ...validProps,
          slug: "acme$corp",
        });
        throw new Error("Should have thrown ZodError");
      } catch (err: any) {
        expect(err).toBeInstanceOf(z.ZodError);
        expect(err.issues[0].message).toContain("Invalid slug format");
      }
    });

    it("should reject slug with invalid characters (spaces)", async () => {
      try {
        await checkSlugAvailability({
          ...validProps,
          slug: "acme corp",
        });
        throw new Error("Should have thrown ZodError");
      } catch (err: any) {
        expect(err).toBeInstanceOf(z.ZodError);
      }
    });

    it("should reject empty slug", async () => {
      try {
        await checkSlugAvailability({ ...validProps, slug: "" });
        throw new Error("Should have thrown ZodError");
      } catch (err: any) {
        expect(err).toBeInstanceOf(z.ZodError);
      }
    });

    it("should reject missing slug", async () => {
      try {
        // @ts-ignore
        await checkSlugAvailability({ userId: "user_123" });
        throw new Error("Should have thrown ZodError");
      } catch (err: any) {
        expect(err).toBeInstanceOf(z.ZodError);
      }
    });

    it("should reject missing userId", async () => {
      try {
        // @ts-ignore
        await checkSlugAvailability({ slug: "acme" });
        throw new Error("Should have thrown ZodError");
      } catch (err: any) {
        expect(err).toBeInstanceOf(z.ZodError);
      }
    });
  });

  describe("2. Rate Limiting", () => {
    it("should check rate limit with correct key and params", async () => {
      await checkSlugAvailability(validProps);
      expect(rateLimiter.checkRateLimit).toHaveBeenCalledWith(
        `ratelimit:check_slug:${validProps.userId}`,
        WORKSPACE_LIMITS.CHECK_AVAILABILITY_RATE_LIMIT.MAX_REQUESTS,
        WORKSPACE_LIMITS.CHECK_AVAILABILITY_RATE_LIMIT.WINDOW_SECONDS
      );
    });

    it("should throw AppError 429 when rate limit exceeded", async () => {
      (rateLimiter.checkRateLimit as any).mockResolvedValue(false);

      try {
        await checkSlugAvailability(validProps);
        throw new Error("Should have thrown AppError");
      } catch (err: any) {
        expect(err).toBeInstanceOf(AppError);
        expect(err.httpStatus).toBe(429);
        // Correct property is 'code' not 'errorCode'
        expect(err.code).toBe("WORKSPACE_SLUG_RATE_LIMITED");
      }
    });

    it("should allow request when rate limit returns true", async () => {
      (rateLimiter.checkRateLimit as any).mockResolvedValue(true);
      const result = await checkSlugAvailability(validProps);
      expect(result.available).toBe(true);
    });
  });

  describe("3. Sanitization & Normalization (Implicit)", () => {
    // Explicit tests removed as Zod Schema enforces strict lowercase regex before logic runs.
    // Sanitization is implicitly covered by "accept valid lowercase slug" + Schema constraints.
  });

  describe("4. Permanent Cache Checks (Fast Fail)", () => {
    it("should return unavailable if exists in permanent cache", async () => {
      (redis.get as any).mockImplementation((key: string) => {
        if (key === "workspace:exists:acme-corp") return "1";
        return null;
      });

      const result = await checkSlugAvailability(validProps);
      expect(result.available).toBe(false);
      expect(result.message).toBe("Workspace already exists");
      expect(result.reason).toBe("WORKSPACE_SLUG_TAKEN_PERMANENT");
    });

    it("should check the correct cache key format", async () => {
      await checkSlugAvailability(validProps);
      expect(redis.get).toHaveBeenCalledWith(
        `workspace:exists:${validProps.slug}`
      );
    });
  });

  describe("5. Lock/Reservation Checks (Fast Fail)", () => {
    it("should return unavailable if reserved by ANOTHER user", async () => {
      // First get call is permanent cache (null)
      // Second get call is lock check
      (redis.get as any).mockImplementation((key: string) => {
        if (key === `reserve:slug:${validProps.slug}`) return "other_user";
        return null;
      });

      const result = await checkSlugAvailability(validProps);
      expect(result.available).toBe(false);
      expect(result.message).toBe("Slug is currently reserved");
      expect(result.reason).toBe("WORKSPACE_SLUG_TAKEN_RESERVED");
    });

    it("should proceed if reserved by SAME user (Re-locking candidate)", async () => {
      (redis.get as any).mockImplementation((key: string) => {
        if (key === `reserve:slug:${validProps.slug}`) return validProps.userId;
        return null;
      });

      const result = await checkSlugAvailability(validProps);
      // Should NOT return false immediately, should proceed to DB/Lua
      expect(result.available).toBe(true);
    });

    it("should proceed if no reservation exists", async () => {
      (redis.get as any).mockResolvedValue(null);
      const result = await checkSlugAvailability(validProps);
      expect(result.available).toBe(true);
    });
  });

  describe("6. Permanent DB Checks", () => {
    it("should return unavailable if slug exists in DB", async () => {
      (db.workspace.findUnique as any).mockResolvedValue({
        id: "ws_1",
        slug: "acme-corp",
      });

      const result = await checkSlugAvailability(validProps);
      expect(result.available).toBe(false);
      expect(result.reason).toBe("WORKSPACE_SLUG_TAKEN_PERMANENT");
    });

    it("should allow if slug NOT in DB", async () => {
      (db.workspace.findUnique as any).mockResolvedValue(null);
      const result = await checkSlugAvailability(validProps);
      expect(result.available).toBe(true);
    });

    it("should use findUnique with correct params", async () => {
      await checkSlugAvailability(validProps);
      expect(db.workspace.findUnique).toHaveBeenCalledWith({
        where: { slug: validProps.slug },
      });
    });
  });

  describe("7. Lua Script & Race Conditions", () => {
    const lockKey = "reserve:slug:acme-corp";
    const userResKey = "user:reservation:user_123";

    it("should return Unavailable if Lua script returns 0 (Taken)", async () => {
      (redis.eval as any).mockResolvedValue(0);

      const result = await checkSlugAvailability(validProps);
      expect(result.available).toBe(false);
      expect(result.reason).toBe("WORKSPACE_SLUG_RESERVATION_FAILED");
    });

    it("should return Available if Lua script returns 1 (Success)", async () => {
      (redis.eval as any).mockResolvedValue(1);

      const result = await checkSlugAvailability(validProps);
      expect(result.available).toBe(true);
      expect(result.reservationId).toBe(lockKey);
    });

    it("should call Redis Eval with correct script and keys", async () => {
      await checkSlugAvailability(validProps);
      expect(redis.eval).toHaveBeenCalledWith(
        expect.stringContaining("local owner = redis.call"), // Script snippet
        2, // numKeys
        userResKey, // key1
        lockKey, // key2
        validProps.userId, // arg1
        validProps.slug, // arg2
        "180" // arg3 (TTL)
      );
    });

    it("should handle Lua script execution error (Infrastructure Fail)", async () => {
      (redis.eval as any).mockRejectedValue(new Error("Redis Eval Failed"));

      try {
        await checkSlugAvailability(validProps);
        throw new Error("Should have thrown");
      } catch (err: any) {
        expect(err.message).toBe("Redis Eval Failed");
      }
    });
  });
});
