import { db } from "@/infra/db";
import { redis } from "@/infra/redis";
import { AppError } from "@/shared/errors";
import { SlugUtil } from "@/shared/utils/slug.util";
import { Prisma, Project } from "@prisma/client";
import { CreateProjectInput } from "./types";
import { LockingService, createLockKeys } from "@/services/locking";

const RESERVED_PROJECT_KEYS = [
  "settings",
  "admin",
  "api",
  "billing",
  "support",
];

export const createProject = async (input: {
  workspaceId: string;
  input: CreateProjectInput;
  userId: string;
}): Promise<Project> => {
  const { workspaceId, input: rawInput, userId } = input;

  const sanitizedInput = {
    ...rawInput,
    name: rawInput.name.trim().replace(/[<>]/g, ""),
    description: rawInput.description
      ? rawInput.description.trim().replace(/[<>]/g, "")
      : undefined,
  };

  const member = await db.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId: workspaceId,
        userId: userId,
      },
    },
  });

  if (!member) {
    throw AppError.forbidden(
      "User is not a member of this workspace",
      "PROJECT_CREATION_MISSING_PERMISSION"
    );
  }

  let slug =
    sanitizedInput.slug || SlugUtil.sanitize(sanitizedInput.name).toLowerCase();
  slug = slug.toLowerCase();

  if (RESERVED_PROJECT_KEYS.includes(slug)) {
    throw AppError.conflict(
      `Project key '${slug}' is a reserved system keyword.`,
      "PROJECT_SLUG_TAKEN_RESERVED"
    );
  }

  const keys = createLockKeys("project", {
    type: "workspace",
    id: workspaceId,
  });
  const lockKey = keys.resource(slug);
  const reservedBy = await redis.get(lockKey);

  if (reservedBy && reservedBy !== userId) {
    throw AppError.conflict(
      "Reservation expired or stolen. Please check availability again.",
      "PROJECT_CREATION_RESERVATION_STOLEN"
    );
  }

  try {
    const newProject = await db.$transaction(async (tx) => {
      const existing = await tx.project.findUnique({
        where: {
          workspaceId_key: { workspaceId, key: slug },
        },
      });
      if (existing)
        throw AppError.conflict(
          "Project key already exists",
          "PROJECT_CREATION_DB_CONFLICT"
        );

      const project = await tx.project.create({
        data: {
          workspaceId,
          key: slug,
          name: sanitizedInput.name,
          description: sanitizedInput.description,
        },
      });

      await tx.projectMember.create({
        data: {
          workspaceId,
          projectId: project.id,
          userId: userId,
        },
      });

      return project;
    });

    // 3. Finalize: Convert Lock -> "Exists" Cache (Atomic)
    // Matches Workspace Logic for parity
    const existsKey = keys.exists(slug);
    const userResKey = keys.userReservation(userId);

    try {
      await LockingService.finalize(
        lockKey,
        existsKey,
        "1",
        3600, // 1 hour soft cache
        userId,
        userResKey
      );
    } catch (error) {
      if (error instanceof AppError) {
        // Log but don't fail the request since DB is committed
        console.warn("Project Lock Finalize Error:", error.message);
      }
    }

    return newProject;
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        throw AppError.conflict(
          "Project key already exists (Constraint)",
          "PROJECT_CREATION_DB_CONFLICT"
        );
      }
    }
    if (error instanceof AppError) throw error;
    throw new AppError(
      "Failed to create project",
      "PROJECT_CREATION_FAILED",
      500
    );
  }
};
