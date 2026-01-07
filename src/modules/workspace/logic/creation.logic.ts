import { db } from "@/infra/db";
import { SlugUtil } from "@/shared/utils/slug.util";
import { redis } from "@/infra/redis";
import { AppError } from "@/shared/errors";
import { logger } from "@/shared/logger";
import { QuotaService } from "@/modules/quota/service";
import { Prisma } from "@prisma/client";
import { CreateWorkspaceSchema } from "../types";

export const CreationLogic = {
  async createWorkspace(input: { slug: string; name: string; userId: string }) {
    const { slug, name, userId } = CreateWorkspaceSchema.parse(input);
    const normalizedSlug = SlugUtil.sanitize(slug);

    // XSS Sanitization
    const sanitizedName = name.trim().replace(/[<>]/g, "");

    // 0. Quota Check
    await QuotaService.enforceQuota(userId, "MAX_OWNED_WORKSPACES");

    // 1. Strict Lock Validation
    const lockKey = `reserve:slug:${normalizedSlug}`;
    const reservedBy = await redis.get(lockKey);

    if (reservedBy !== userId) {
      throw AppError.conflict(
        "Reservation expired or stolen. Please check availability again.",
        "WORKSPACE_CREATION_RESERVATION_STOLEN"
      );
    }

    // 2. Create Workspace (Transaction)
    try {
      const workspace = await db.workspace.create({
        data: {
          name: sanitizedName,
          slug: normalizedSlug,
          members: {
            create: {
              userId,
              role: "OWNER",
            },
          },
        },
      });

      // 3. Cleanup & Cache
      const userResKey = `user:reservation:${userId}`;
      await Promise.all([
        redis.del(lockKey),
        redis.del(userResKey),
        redis.set(`workspace:exists:${normalizedSlug}`, "1", "EX", 3600),
      ]);

      logger.info(
        { workspaceId: workspace.id, slug: normalizedSlug, userId },
        "Created Workspace (Sync)"
      );

      return workspace;
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
          await redis.del(lockKey);
          throw AppError.conflict(
            "Workspace URL is already taken.",
            "WORKSPACE_CREATION_DB_CONFLICT"
          );
        }
        if (error.code === "P2003") {
          await redis.del(lockKey);
          throw new AppError(
            "User account issue. Please re-login.",
            "UNAUTHORIZED",
            401
          );
        }
      }
      throw error;
    }
  },
};
