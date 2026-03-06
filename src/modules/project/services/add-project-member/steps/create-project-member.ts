/** Create the project membership. Throws CONFLICT if already a project member. */
import { AppError } from "@/shared/errors";
import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";

export async function createProjectMember(
  projectId: string,
  workspaceId: string,
  userId: string,
  db: PrismaClient
) {
  try {
    return await db.projectMember.create({
      data: { projectId, workspaceId, userId },
      include: { user: true },
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw AppError.conflict("User is already a member of this project");
    }
    throw err;
  }
}
