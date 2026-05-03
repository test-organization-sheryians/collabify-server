/**
 * updateProjectFields — DB Step
 *
 * Updates mutable project fields. When `key` is being changed, performs a
 * workspace-scoped uniqueness check first (mirrors the @@unique([workspaceId, key])
 * constraint at the DB level — a duplicate will throw a Prisma P2002 if we skip this,
 * but the explicit check gives a cleaner error message).
 *
 * Guards: if the cleaned data object is empty, performs a read-only existence check
 * instead of a no-op update (which Prisma allows but is wasteful).
 *
 * Returns the updated project row.
 */
import { Prisma } from "@prisma/client";
import { AppError } from "@/shared/errors";
import type { PrismaClient } from "@prisma/client";

interface UpdateData {
  name?: string;
  description?: string | null;
  isPrivate?: boolean;
  logoS3Key?: string | null;
  key?: string;
}

export async function updateProjectFields(
  projectId: string,
  rawData: UpdateData,
  db: PrismaClient
) {
  // Strip undefined values — Prisma should handle them, but explicit stripping
  // guarantees we never accidentally unset a non-nullable field (e.g. key).
  const data: Record<string, unknown> = {};
  if (rawData.name !== undefined) data.name = rawData.name;
  if (rawData.description !== undefined) data.description = rawData.description;
  if (rawData.isPrivate !== undefined) data.isPrivate = rawData.isPrivate;
  if (rawData.logoS3Key !== undefined) data.logoS3Key = rawData.logoS3Key;
  if (rawData.key !== undefined) data.key = rawData.key;

  // If key is being changed, verify workspace-scoped uniqueness before writing
  if (rawData.key !== undefined) {
    const project = await db.project.findUnique({
      where: { id: projectId },
      select: { workspaceId: true, key: true },
    });
    if (!project) throw AppError.notFound("Project not found");

    // Only check uniqueness if the key is actually different
    if (rawData.key !== project.key) {
      const conflict = await db.project.findUnique({
        where: { workspaceId_key: { workspaceId: project.workspaceId, key: rawData.key } },
        select: { id: true },
      });
      if (conflict) {
        throw AppError.conflict(
          "A project with this key already exists in this workspace"
        );
      }
    }
  }

  // No-op guard: if nothing to update, just verify the project exists and return it
  if (Object.keys(data).length === 0) {
    const existing = await db.project.findUnique({ where: { id: projectId } });
    if (!existing) throw AppError.notFound("Project not found");
    return existing;
  }

  try {
    return await db.project.update({
      where: { id: projectId },
      data,
    });
  } catch (err) {
    // P2025 = "Record to update not found"
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      throw AppError.notFound("Project not found");
    }
    // Re-throw any other Prisma error (constraint violations, DB failures) with context
    throw err;
  }
}
