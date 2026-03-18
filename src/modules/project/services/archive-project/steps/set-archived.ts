/** Set project isArchived = true and return updated project. */
import { AppError } from "@/shared/errors";
import type { PrismaClient } from "@prisma/client";

export async function setArchived(projectId: string, db: PrismaClient) {
  try {
    return await db.project.update({
      where: { id: projectId },
      data: { isArchived: true },
    });
  } catch {
    throw AppError.notFound("Project not found");
  }
}
