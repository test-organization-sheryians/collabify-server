/**
 * Atomically updates workspace.slug in DB.
 * Catches P2002 (unique constraint) and throws CONFLICT.
 * Catches P2025 (record not found) and throws NOT_FOUND.
 */
import { AppError } from "@/shared/errors";
import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";

export async function renameSlugInDb(
  workspaceId: string,
  newSlug: string,
  db: PrismaClient
) {
  try {
    return await db.workspace.update({
      where: { id: workspaceId },
      data: { slug: newSlug },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        throw AppError.conflict(
          "This workspace URL is already taken.",
          "WORKSPACE_SLUG_CONFLICT"
        );
      }
      if (error.code === "P2025") {
        throw AppError.notFound("Workspace not found.");
      }
    }
    throw error;
  }
}
