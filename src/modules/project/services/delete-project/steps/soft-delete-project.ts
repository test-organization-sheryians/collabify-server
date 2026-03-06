/** Soft-delete the project by setting deletedAt. */
import { AppError } from "@/shared/errors";
import type { PrismaClient } from "@prisma/client";

export async function softDeleteProject(
  projectId: string,
  db: PrismaClient
): Promise<void> {
  try {
    await db.project.update({
      where: { id: projectId },
      data: { deletedAt: new Date() },
    });
  } catch {
    throw AppError.notFound("Project not found");
  }
}
