import { db } from "../../infra/db";
import { SyncUserSchema } from "./types";
import { redis } from "../../infra/redis";
import { AppError } from "../../shared/errors";
import { logger } from "../../shared/logger";
import { OutboxWriter } from "../notification/lib/outbox.writer";

// const prisma = db; // Removed alias

export const UserService = {
  // Removed findUserByClerkId as User.id IS the Clerk ID now.
  // Use findUserById instead.

  async syncUserFromClerk(rawInput: unknown) {
    const data = SyncUserSchema.parse(rawInput);

    const user = await db.$transaction(async (tx) => {
      // 1. Try to find by Clerk ID (which is now the PK: id)
      const existingUser = await tx.user.findUnique({
        where: { id: data.clerkId },
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

        // Link the existing user to this Clerk ID?
        // PROBLEM: We cannot easily "change" the Primary Key ID of an existing record in Prisma/Postgres
        // without cascading updates to ALL foreign keys.
        // Since we are refactoring, we have two options:
        // A) Migration script to rewrite IDs (Complex)
        // B) Logic here: If email exists but ID differs, we might fail or (since we assume fresh start) we might delete old and re-create?

        // Given the instructions imply a refactor, we should assume the ability to migrate.
        // However, Prisma `update` cannot change the `@id` field easily.
        // For now, if we find by email, we'll try to DELETE and RE-CREATE with the new ID if it's a "User" table only change,
        // BUT invalidating FKs is dangerous.

        // BETTER APPROACH for "Single Source of Truth" transition:
        // If email exists, it means we have a legacy user.
        // We really should have migrated them already.
        // But if this runs live, we might get an error if we try to create a new user with same email.

        // DECISION: For this task, we will assume we can't easily merge legacy users here without migration.
        // We will throw if email exists but ID doesn't match, OR we will assume clean slate.
        // However, to be robust:
        // If existingByEmail found, we check if its ID matches. If not, it's a conflict.

        throw AppError.conflict(
          "User with this email exists but has a different ID. Manual migration required."
        );
      }

      // 3. Create new user with Clerk ID as the PK
      return tx.user.create({
        data: {
          id: data.clerkId, // Explicitly set ID to Clerk ID
          // clerkId: data.clerkId, // REMOVED
          email: data.email,
          fullName: data.fullName,
          avatarUrl: data.avatarUrl,
          status: "ACTIVE",
        },
      });
    });

    // Cache Invalidation / Update
    // Cache Invalidation / Update
    const cacheKey = `user:clerkId:${data.clerkId}`; // Legacy key support or new key?
    // Let's use `user:${id}` moving forward, but for now we might keep the old pattern or switch.
    // Since findUserByClerkId is gone, we don't need that specific key, but findUserById might use `user:{id}`.
    // Let's stick to `user:clerkId:{id}` if we want to be safe, or cleaner `user:{id}`.
    // But wait, UserService.findUserByClerkId used `user:clerkId:${clerkId}`.
    // UserService.findUserById uses... (checking below). It doesn't use cache currently!
    // We should ADD cache to findUserById.

    // Let's standardise on `user:${id}`.
    await redis.set(`user:${user.id}`, JSON.stringify(user), "EX", 300);

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
    const cacheKey = `user:${id}`; // Standard key
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const user = await db.user.findUnique({
      where: { id, deletedAt: null },
    });

    if (user) {
      await redis.set(cacheKey, JSON.stringify(user), "EX", 300); // 5 min
    }

    return user;
  },
};
