import { describe, it, expect, mock, beforeEach } from "bun:test";
import { syncUser } from "./handler";
import { db } from "@/infra/db"; // Use alias
import { redis } from "@/infra/redis";
import { AppError } from "@/shared/errors";
import { ServiceContext } from "@/graphql/types"; // Import ServiceContext

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

const mockTx = {
  user: {
    findUnique: mock(),
    update: mock(),
    create: mock(),
  },
  notificationOutbox: {
    create: mock(),
  },
};

mock.module("@/infra/db", () => ({
  db: {
    user: {
      findUnique: mock(),
      update: mock(),
      create: mock(),
    },
    $transaction: mock(async (callback: any) => {
      return callback(mockTx);
    }),
  },
}));

// Mock Context
const mockCtx = {
  db: db,
  redis: redis,
  // usage: {} // Add other context fields if needed by handler, but currently handler extracts db, redis
} as unknown as ServiceContext;

// -----------------------------------------------------------------------------
// TESTS
// -----------------------------------------------------------------------------

describe("syncUser Feature Suite", () => {
  beforeEach(() => {
    mock.restore();
    (redis.get as any).mockClear();
    (redis.set as any).mockClear();
    (db.user.findUnique as any).mockClear();
    (mockTx.user.findUnique as any).mockClear();
    (mockTx.user.update as any).mockClear();
    (mockTx.user.create as any).mockClear();
    (redis.get as any).mockResolvedValue(null);
    (db.user.findUnique as any).mockResolvedValue(null);
  });

  describe("1. Core Logic & Security", () => {
    const validInput = {
      clerkId: "clerk_new",
      email: "new@example.com",
      fullName: "New User",
      avatarUrl: "https://example.com/pic.png",
      emailVerified: true,
    };

    it("should REVIVE a zombie user (soft-deleted)", async () => {
      const zombieUser = { ...mockUser, deletedAt: new Date() };
      (mockTx.user.findUnique as any).mockResolvedValueOnce(zombieUser);
      (mockTx.user.update as any).mockResolvedValue({
        ...zombieUser,
        deletedAt: null,
      });

      await syncUser(validInput, mockCtx); // Pass mockCtx

      expect(mockTx.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: zombieUser.id },
          data: expect.objectContaining({ deletedAt: null }),
        })
      );
    });

    it("should BLOCK Account Linking if email is not verified (Security)", async () => {
      (mockTx.user.findUnique as any)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ ...mockUser, id: "old_clerk" });

      const attackInput = { ...validInput, emailVerified: false };

      try {
        await syncUser(attackInput, mockCtx); // Pass mockCtx
        throw new Error("Should have thrown FORBIDDEN");
      } catch (err: any) {
        expect(err).toBeInstanceOf(AppError);
        expect(err.httpStatus).toBe(403);
      }
    });

    it("should THROW Conflict if email exists but ID differs (No Linking)", async () => {
      (mockTx.user.findUnique as any)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ ...mockUser, id: "different_id" });

      try {
        await syncUser(
          {
            ...validInput,
            emailVerified: true,
          },
          mockCtx
        ); // Pass mockCtx
        throw new Error("Should have thrown Conflict");
      } catch (err: any) {
        expect(err).toBeInstanceOf(AppError);
        expect(err.httpStatus).toBe(409);
      }
    });
  });

  describe("2. Concurrency & Race Conditions", () => {
    it("should propagate P2002 (Unique Constraint) on simulate race", async () => {
      (mockTx.user.findUnique as any).mockResolvedValue(null);
      (mockTx.user.create as any).mockRejectedValue(
        new Error("Unique constraint failed on the fields: (`id`)")
      );

      const input = {
        clerkId: "race_user",
        email: "race@race.com",
        emailVerified: true,
      };

      try {
        await syncUser(input, mockCtx); // Pass mockCtx
        throw new Error("Should have thrown P2002");
      } catch (err: any) {
        expect(err.message).toContain("Unique constraint");
      }
    });
  });

  describe("3. Fresh User Creation (Happy Path)", () => {
    it("should create a new user if not found by ClerkID or Email", async () => {
      const newUserInput = {
        clerkId: "clerk_fresh",
        email: "fresh@example.com",
        fullName: "Fresh User",
        avatarUrl: "https://example.com/fresh.png",
        emailVerified: true,
        email_verified: true, // Legacy field support if needed? No, z schema handles camelCase mapping if needed, but here we pass object matching schema.
      };

      (mockTx.user.findUnique as any).mockResolvedValue(null);
      (mockTx.user.create as any).mockResolvedValue({
        ...mockUser,
        id: "fresh_id",
      });

      await syncUser(newUserInput, mockCtx); // Pass mockCtx

      expect(mockTx.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            id: "clerk_fresh",
            email: "fresh@example.com",
          }),
        })
      );
    });
  });

  describe("4. Infrastructure Chaos (Write Path)", () => {
    it("should FAIL the sync if Redis Cache Update throws", async () => {
      (mockTx.user.findUnique as any).mockResolvedValue(mockUser);
      (redis.set as any).mockRejectedValue(new Error("Redis Dead"));

      const input = {
        clerkId: "clerk_123",
        email: "test@example.com",
        emailVerified: true,
      };

      try {
        await syncUser(input, mockCtx); // Pass mockCtx
        throw new Error("Should have thrown Redis Error");
      } catch (err: any) {
        expect(err.message).toBe("Redis Dead");
      }
    });
  });
});
