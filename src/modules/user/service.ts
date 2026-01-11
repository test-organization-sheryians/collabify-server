import { db } from "../../infra/db";
import { SyncUserSchema } from "./types";
import { redis } from "../../infra/redis";
import { AppError } from "../../shared/errors";
import { logger } from "../../shared/logger";
import { OutboxWriter } from "../notification/lib/outbox.writer";

// const prisma = db; // Removed alias

export const UserService = {
  async findUserByClerkId(clerkId: string) {
    const cacheKey = `user:clerkId:${clerkId}`;
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const user = await db.user.findUnique({
      where: { clerkId, deletedAt: null },
    });

    if (user) {
      await redis.set(cacheKey, JSON.stringify(user), "EX", 300); // 5 min TTL
    }

    return user;
  },

  async syncUserFromClerk(rawInput: unknown) {
    const data = SyncUserSchema.parse(rawInput);

    const user = await db.$transaction(async (tx) => {
      // 1. Try to find by Clerk ID
      const existingUser = await tx.user.findUnique({
        where: { clerkId: data.clerkId },
      });

      if (existingUser) {
        // Update existing user & REVIVE if soft-deleted
        return tx.user.update({
          where: { id: existingUser.id },
          data: {
            email: data.email,
            fullName: data.fullName ?? existingUser.fullName,
            avatarUrl: data.avatarUrl ?? existingUser.avatarUrl,
            status: "ACTIVE",
            deletedAt: null, // FIX: Zombie Resurrection
          },
        });
      }

      // 2. Try to find by Email (Account Linking)
      const existingByEmail = await tx.user.findUnique({
        where: { email: data.email },
      });

      if (existingByEmail) {
        // SECURITY: Prevent Account Takeover via Unverified Email
        if (!data.emailVerified) {
          throw AppError.forbidden(
            "Cannot link account: Email is not verified."
          );
        }

        // Link the existing user to this Clerk ID
        return tx.user.update({
          where: { id: existingByEmail.id },
          data: {
            clerkId: data.clerkId,
            fullName: data.fullName ?? existingByEmail.fullName,
            avatarUrl: data.avatarUrl ?? existingByEmail.avatarUrl,
            status: "ACTIVE",
            deletedAt: null, // Ensure target is alive
          },
        });
      }

      // 3. Create new user
      return tx.user.create({
        data: {
          clerkId: data.clerkId,
          email: data.email,
          fullName: data.fullName,
          avatarUrl: data.avatarUrl,
          status: "ACTIVE",
        },
      });
    });

    // Cache Invalidation / Update
    const cacheKey = `user:clerkId:${data.clerkId}`;
    await redis.set(cacheKey, JSON.stringify(user), "EX", 300);

    // -------------------------------------------------------------------------
    // Phase 13: Welcome Event (At-Most-Once)
    // -------------------------------------------------------------------------
    try {
      await OutboxWriter.emit(db, {
        type: "welcome.user",
        payload: {
          userId: user.id,
          userName: user.fullName || "Collabify User",
          userEmail: user.email,
        },
        deduplicationId: `welcome-v1:${user.id}`, // <--- The Guard Rail
      });
    } catch (rawError: unknown) {
      // Safe cast to check properties
      const err = rawError as { code?: string; message?: string };

      // P2002 = Unique Constraint Violation (DeduplicationId)
      // If this happens, it means the user already got the welcome email.
      // We silently ignore it.
      if (err.code !== "P2002" && !err.message?.includes("Unique constraint")) {
        // Log real errors using standard logger, but don't fail the login
        // We wrap it in a pseudo AppError metadata structure for visibility
        logger.error({ err }, "Failed to queue welcome email");
      }
    }

    return user;
  },

  async findUserById(id: string) {
    return db.user.findUnique({
      where: { id, deletedAt: null },
    });
  },
};
