/** Update project fields. Returns updated project. Throws NOT_FOUND if project missing. */
import { AppError } from "@/shared/errors";
import type { PrismaClient } from "@prisma/client";

interface UpdateData {
  name?: string;
  description?: string | null;
  isPrivate?: boolean;
}

export async function updateProjectFields(
  projectId: string,
  data: UpdateData,
  db: PrismaClient
) {
  try {
    return await db.project.update({
      where: { id: projectId },
      data,
    });
  } catch {
    throw AppError.notFound("Project not found");
  }
}
