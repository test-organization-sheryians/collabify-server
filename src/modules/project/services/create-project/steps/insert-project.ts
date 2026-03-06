/**
 * Atomically create the project and seed the creator as a ProjectMember.
 * Handles Prisma P2002 unique constraint error.
 */
import { AppError } from "@/shared/errors";
import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import type { CreateProjectInput } from "../types";

export async function insertProject(
  workspaceId: string,
  userId: string,
  slug: string,
  input: CreateProjectInput,
  db: PrismaClient
) {
  try {
    return await db.$transaction(async (tx) => {
      const existing = await tx.project.findUnique({
        where: { workspaceId_key: { workspaceId, key: slug } },
        select: { id: true },
      });
      if (existing) {
        throw AppError.conflict(
          "Project key already exists",
          "PROJECT_CREATION_DB_CONFLICT"
        );
      }

      const project = await tx.project.create({
        data: {
          workspaceId,
          key: slug,
          name: input.name,
          description: input.description,
        },
      });

      await tx.projectMember.create({
        data: { workspaceId, projectId: project.id, userId },
      });

      return project;
    });
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw AppError.conflict(
        "Project key already exists (Constraint)",
        "PROJECT_CREATION_DB_CONFLICT"
      );
    }
    if (error instanceof AppError) throw error;
    throw new AppError(
      "Failed to create project",
      "PROJECT_CREATION_FAILED",
      500
    );
  }
}
