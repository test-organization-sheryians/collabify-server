/** Soft-delete the user account by setting deletedAt. */
import { AppError } from "@/shared/errors";
import type { PrismaClient } from "@prisma/client";

export async function softDeleteUser(
  userId: string,
  db: PrismaClient
): Promise<void> {
  try {
    await db.user.update({
      where: { id: userId },
      data: { deletedAt: new Date() },
    });
  } catch {
    throw AppError.notFound("User not found");
  }
}
