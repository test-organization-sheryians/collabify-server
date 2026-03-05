/** Fetch user from the database by ID (excluding soft-deleted rows). */
import type { PrismaClient } from "@prisma/client";

export async function fetchUserFromDb(userId: string, db: PrismaClient) {
  return db.user.findUnique({
    where: { id: userId, deletedAt: null },
  });
}
