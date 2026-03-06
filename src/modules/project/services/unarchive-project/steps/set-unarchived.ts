/** Set project isArchived = false and return updated project. */
import { AppError } from "@/shared/errors";
import type { PrismaClient } from "@prisma/client";

export async function setUnarchived(projectId: string, db: PrismaClient) {
  try {
    return await db.project.update({
      where: { id: projectId },
      data: { isArchived: false },
    });
  } catch {
    throw AppError.notFound("Project not found");
  }
}
