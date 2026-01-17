import { db } from "@/infra/db";
import { redis } from "@/infra/redis";
import { AppError } from "@/shared/errors";
import { SlugUtil } from "@/shared/utils/slug.util";
import { CreateProjectInput, CreateProjectSchema } from "../types";
import { ServiceContext } from "@/graphql/types";
import { Prisma, Project } from "@prisma/client";

const RESERVED_PROJECT_KEYS = [
  "settings",
  "admin",
  "api",
  "billing",
  "support",
];

export const creationLogic = {
  createProject: async (
    ctx: ServiceContext,
    workspaceId: string,
    rawInput: CreateProjectInput
  ): Promise<Project> => {
    if (!ctx.auth.userId) {
      throw AppError.unauthorized("User not authenticated");
    }
    const clerkId = ctx.auth.userId;

    // Resolve Internal User ID
    const user = await db.user.findUnique({
      where: { clerkId },
      select: { id: true },
    });

    if (!user) {
      throw AppError.unauthorized("User account not found");
    }

    const userId = user.id;

    if (!workspaceId) {
      throw AppError.badRequest("Workspace ID is required");
    }

    const sanitizedInput = {
      ...rawInput,
      name: rawInput.name.trim().replace(/[<>]/g, ""),
      description: rawInput.description
        ? rawInput.description.trim().replace(/[<>]/g, "")
        : undefined,
    };

    const input = CreateProjectSchema.parse(sanitizedInput);

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

    let slug = input.slug || SlugUtil.sanitize(input.name).toLowerCase();
    slug = slug.toLowerCase();

    if (RESERVED_PROJECT_KEYS.includes(slug)) {
      throw AppError.conflict(
        `Project key '${slug}' is a reserved system keyword.`,
        "PROJECT_SLUG_TAKEN_RESERVED"
      );
    }

    const lockKey = `lock:workspace:${workspaceId}:project:${slug}`;
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
            name: input.name,
            description: input.description,
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

      await redis.del(lockKey);

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
  },
};
