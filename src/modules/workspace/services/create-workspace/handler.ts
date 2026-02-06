import { SlugUtil } from "@/shared/utils/slug.util";
import { AppError } from "@/shared/errors";
import { logger } from "@/shared/logger";
import { QuotaService } from "@/modules/quota/service";
import { Prisma } from "@prisma/client";
import { CreateWorkspaceInput } from "./types";
import { NotificationModule } from "@/modules/notification";
import { ServiceContext } from "@/graphql/types";
import { LockingService, createLockKeys } from "@/services/locking";

export const createWorkspace = async (
  input: CreateWorkspaceInput,
  ctx: ServiceContext
) => {
  const { slug, name, userId } = input;
  const { db, redis } = ctx; // Use instances from context

  const normalizedSlug = SlugUtil.sanitize(slug);

  // XSS Sanitization
  const sanitizedName = name.trim().replace(/[<>]/g, "");

  // 0. Quota Check
  await QuotaService.enforceQuota(userId, "MAX_OWNED_WORKSPACES");

  const keys = createLockKeys("workspace");

  // 1. Strict Lock Validation
  const lockKey = keys.resource(normalizedSlug);
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

  // 2. Create Workspace (Transaction + Outbox)
  try {
    const workspace = await db.$transaction(async (tx) => {
      const ws = await tx.workspace.create({
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

      // 2.1 Trigger Notification (Producer Wiring)
      // await NotificationModule.notify(tx, {
      //   type: "workspace.created",
      //   actorId: userId,
      //   tenantId: ws.id,
      //   payload: {
      //     workspaceId: ws.id,
      //     name: ws.name,
      //     slug: ws.slug,
      //     ownerId: userId,
      //   },
      // });

      return ws;
    });

    // 3. Cleanup & Cache (Atomic Transition)
    const userResKey = keys.userReservation(userId);
    const existsKey = keys.exists(normalizedSlug);

    try {
      await LockingService.finalize(
        lockKey,
        existsKey,
        "1",
        3600,
        userId,
        userResKey
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
};
