/**
 * Upsert the user inside a Prisma transaction.
 *
 * Priority order:
 *   1. Found by Clerk ID  → update (revive if soft-deleted)
 *   2. Found by Email     → throw FORBIDDEN (unverified) or CONFLICT (id mismatch)
 *   3. Not found          → create new user with Clerk ID as PK
 */
import { AppError } from "@/shared/errors";
import type { SyncUserInput } from "../types";
import type { PrismaClient } from "@prisma/client";

export async function upsertUser(data: SyncUserInput, db: PrismaClient) {
  return db.$transaction(async (tx) => {
    // 1. Try to find by Clerk ID (PK)
    const existingUser = await tx.user.findUnique({
      where: { id: data.clerkId },
    });

    if (existingUser) {
      return tx.user.update({
        where: { id: existingUser.id },
        data: {
          email: data.email,
          fullName: data.fullName ?? existingUser.fullName,
          avatarUrl: data.avatarUrl ?? existingUser.avatarUrl,
          status: "ACTIVE",
          deletedAt: null, // Zombie Resurrection
        },
      });
    }

    // 2. Try to find by Email (Account Linking guard)
    const existingByEmail = await tx.user.findUnique({
      where: { email: data.email },
    });

    if (existingByEmail) {
      if (!data.emailVerified) {
        throw AppError.forbidden("Cannot link account: Email is not verified.");
      }
      throw AppError.conflict(
        "User with this email exists but has a different ID. Manual migration required."
      );
    }

    // 3. Create new user with Clerk ID as PK
    return tx.user.create({
      data: {
        id: data.clerkId,
        email: data.email,
        fullName: data.fullName,
        avatarUrl: data.avatarUrl,
        status: "ACTIVE",
      },
    });
  });
}
