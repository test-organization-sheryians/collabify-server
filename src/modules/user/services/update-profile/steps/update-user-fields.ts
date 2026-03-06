/** Update user's own profile fields. Throws NOT_FOUND if user row is missing. */
import { AppError } from "@/shared/errors";
import type { PrismaClient } from "@prisma/client";

interface UpdateData {
  fullName?: string;
  avatarUrl?: string | null;
}

export async function updateUserFields(
  userId: string,
  data: UpdateData,
  db: PrismaClient
) {
  try {
    return await db.user.update({
      where: { id: userId },
      data,
    });
  } catch {
    throw AppError.notFound("User not found");
  }
}
