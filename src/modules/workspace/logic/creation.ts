import { db } from "@/infra/db";
import { SlugUtil } from "@/shared/utils/slug.util";
import { redis } from "@/infra/redis";
import { AppError } from "@/shared/errors";
import { logger } from "@/shared/logger";
import { QuotaService } from "@/modules/quota/service";
import { Prisma } from "@prisma/client";
import { CreateWorkspaceSchema } from "../types";

const FINALIZE_CREATION_SCRIPT = `
  redis.call("DEL", KEYS[1])
  redis.call("DEL", KEYS[2])
  redis.call("SET", KEYS[3], "1", "EX", ARGV[1])
  return 1
`;

export const creationLogic = {
  async createWorkspace(input: { slug: string; name: string; userId: string }) {
    const { slug, name, userId } = CreateWorkspaceSchema.parse(input);
    const normalizedSlug = SlugUtil.sanitize(slug);

    // XSS Sanitization
    const sanitizedName = name.trim().replace(/[<>]/g, "");

    // 0. Quota Check
    await QuotaService.enforceQuota(userId, "MAX_OWNED_WORKSPACES");

    // 1. Strict Lock Validation
    const lockKey = `reserve:slug:${normalizedSlug}`;
    try {
      const reservedBy = await redis.get(lockKey);

      if (reservedBy !== userId) {
        throw AppError.conflict(
          "Reservation expired or stolen. Please check availability again.",
          "WORKSPACE_CREATION_RESERVATION_STOLEN"
        );
      }
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.warn(
        { error, userId, slug: normalizedSlug },
        "Redis lock check failed, proceeding optimistically"
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

      // 3. Cleanup & Cache (Atomic Transition)
      const userResKey = `user:reservation:${userId}`;
      const existsKey = `workspace:exists:${normalizedSlug}`;

      try {
        await redis.eval(
          FINALIZE_CREATION_SCRIPT,
          3,
          lockKey,
          userResKey,
          existsKey,
          "3600" // ARGV[1]: Cache TTL
        );
      } catch (error) {
        logger.error(
          { error, userId, slug: normalizedSlug },
          "Redis cleanup failed, relying on TTL"
        );
      }

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
