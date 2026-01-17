import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import { logger } from "@/shared/logger";
import { OutboxWriter } from "@/modules/notification/lib/outbox.writer";
import { SyncUserInput } from "./types";

export const syncUser = async (input: SyncUserInput, ctx: ServiceContext) => {
  const data = input;
  const { db, redis } = ctx;

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
        throw AppError.forbidden("Cannot link account: Email is not verified.");
      }

      throw AppError.conflict(
        "User with this email exists but has a different ID. Manual migration required."
      );
    }

    // 3. Create new user with Clerk ID as the PK
    return tx.user.create({
      data: {
        id: data.clerkId, // Explicitly set ID to Clerk ID
        email: data.email,
        fullName: data.fullName,
        avatarUrl: data.avatarUrl,
        status: "ACTIVE",
      },
    });
  });

  // Cache Invalidation / Update
  await redis.set(`user:${user.id}`, JSON.stringify(user), "EX", 300);

  // 13. Welcome Event (At-Most-Once)
  try {
    await OutboxWriter.emit(db, {
      type: "welcome.user",
      payload: {
        userId: user.id,
        userName: user.fullName || "Collabify User",
        userEmail: user.email,
      },
      deduplicationId: `welcome-v1:${user.id}`,
    });
  } catch (rawError: unknown) {
    const err = rawError as { code?: string; message?: string };
    if (err.code !== "P2002" && !err.message?.includes("Unique constraint")) {
      logger.error({ err }, "Failed to queue welcome email");
    }
  }

  return user;
};
