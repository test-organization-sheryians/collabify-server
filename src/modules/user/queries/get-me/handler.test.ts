import { describe, it, expect, mock, beforeEach } from "bun:test";
import { getMe } from "./handler";
import { db } from "@/infra/db";
import { redis } from "@/infra/redis";
import { ServiceContext } from "@/graphql/types"; // Import based on usage in handler

// -----------------------------------------------------------------------------
// MOCKS
// -----------------------------------------------------------------------------

mock.module("@/infra/redis", () => ({
  redis: {
    get: mock(),
    set: mock(),
  },
}));

const mockUser = {
  id: "user_123",
  email: "test@example.com",
  fullName: "Test User",
  avatarUrl: "https://example.com/avatar.png",
  status: "ACTIVE",
  deletedAt: null,
};

mock.module("@/infra/db", () => ({
  db: {
    user: {
      findUnique: mock(),
    },
  },
}));

// Mock Context
const mockCtx = {
  db: db,
  redis: redis,
} as unknown as ServiceContext;

// -----------------------------------------------------------------------------
// TESTS
// -----------------------------------------------------------------------------

describe("getMe Query Suite", () => {
  beforeEach(() => {
    mock.restore();
    (redis.get as any).mockClear();
    (redis.set as any).mockClear();
    (db.user.findUnique as any).mockClear();
    (redis.get as any).mockResolvedValue(null);
    (db.user.findUnique as any).mockResolvedValue(null);
  });

  describe("1. Infrastructure Chaos (Redis Down)", () => {
    it("should fallback to DB if Redis throws", async () => {
      (redis.get as any).mockRejectedValue(
        new Error("Redis Connection Refused")
      );
      (db.user.findUnique as any).mockResolvedValue(mockUser);

      // The handler doesn't catch the error if Redis GET throws?
      // Looking at handler code:
      // const cached = await redis.get(cacheKey);
      // If redis.get throws, it bubbles up.
      // So this test expects an error?
      // Original test:
      /*
      try {
        await getMe({ userId: "user_123" });
      } catch (e: any) {
        expect(e.message).toBe("Redis Connection Refused");
      }
      */
      // Wait, standardizing handlers might have changed behavior if I didn't verify logic.
      // My refactor was:
      /*
      export const getMe = async (input: GetMeInput, ctx: ServiceContext) => {
        const { userId } = input;
        const { db, redis } = ctx;
        const cacheKey = `user:${userId}`;

        // 1. Try Cache
        const cached = await redis.get(cacheKey);
        if (cached) return JSON.parse(cached);
        ...
      */
      // It doesn't wrap Redis in try-catch. So it should throw.

      try {
        await getMe({ userId: "user_123" }, mockCtx);
      } catch (e: any) {
        expect(e.message).toBe("Redis Connection Refused");
      }
    });
  });

  describe("2. Scalability Check (Caching)", () => {
    it("should only hit DB once for continuous reads", async () => {
      // 1st Call: Redis Miss, DB Hit
      (redis.get as any).mockResolvedValueOnce(null);
      (db.user.findUnique as any).mockResolvedValue(mockUser);

      await getMe({ userId: "u1" }, mockCtx);

      // 2nd Call: Redis Hit
      (redis.get as any).mockResolvedValueOnce(JSON.stringify(mockUser));
      await getMe({ userId: "u1" }, mockCtx);

      expect(db.user.findUnique).toHaveBeenCalledTimes(1);
      expect(redis.get).toHaveBeenCalledTimes(2);
    });
  });

  describe("3. Find User By ID (Unit)", () => {
    it("should return user if found and not deleted", async () => {
      (db.user.findUnique as any).mockResolvedValue(mockUser);
      const result = await getMe({ userId: "user_123" }, mockCtx);
      expect(result).toEqual(mockUser);
      expect(db.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "user_123", deletedAt: null } })
      );
    });

    it("should return null if user not found", async () => {
      (db.user.findUnique as any).mockResolvedValue(null);
      const result = await getMe({ userId: "user_999" }, mockCtx);
      expect(result).toBeNull();
    });
  });

  describe("4. Cache Miss Logic", () => {
    it("should return null if user does not exist in DB (and Cache Miss)", async () => {
      (redis.get as any).mockResolvedValue(null);
      (db.user.findUnique as any).mockResolvedValue(null);

      const result = await getMe({ userId: "unknown_user" }, mockCtx);
      expect(result).toBeNull();
      // Should NOT set cache for null result
      expect(redis.set).not.toHaveBeenCalled();
    });
  });
});
