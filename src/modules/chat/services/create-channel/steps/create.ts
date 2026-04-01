import type { ServiceContext } from "@/graphql/types";
import { Prisma } from "@prisma/client";
import { AppError } from "@/shared/errors";
import { LockingService, createLockKeys } from "@/services/locking";
import { SlugUtil } from "@/shared/utils/slug.util";
import { createLogger } from "@/shared/lib/logger";
import type { CreateChannelInput } from "../types";

const logger = createLogger("chat:services:create-channel:create");

export const create = async (
  input: CreateChannelInput,
  ctx: ServiceContext
) => {
  const userId = ctx.auth?.userId as string;

  try {
    const needsLocking =
      input.projectId &&
      input.name &&
      ["PUBLIC", "PRIVATE"].includes(input.type);

    let lockKey: string | null = null;
    let keys: ReturnType<typeof createLockKeys> | null = null;
    let normalizedSlug = "";

    if (needsLocking && input.projectId && input.name) {
      normalizedSlug = SlugUtil.sanitize(input.name).toLowerCase();
      keys = createLockKeys("channel", {
        type: "project",
        id: input.projectId,
      });
      lockKey = keys.resource(normalizedSlug);

      // Verify Lock
      const reservedBy = await ctx.redis.get(lockKey);

      if (reservedBy && reservedBy !== userId) {
        throw AppError.conflict(
          "Channel Name reserved by another user",
          "CHANNEL_NAME_RESERVATION_STOLEN"
        );
      }
    }

    // 4. Create Channel
    const channel = await ctx.db.$transaction(async (tx) => {
      // Resolve which users to add as MEMBER (excluding creator who is always OWNER)
      let memberIdsToAdd: string[] =
        input.memberUserIds?.filter((id) => id !== userId) ?? [];

      if (input.projectId) {
        // Auto-add every current project member when channel is project-scoped
        const projectMembers = await tx.projectMember.findMany({
          where: { projectId: input.projectId },
          select: { userId: true },
        });

        const projectMemberIds = projectMembers
          .map((m) => m.userId)
          .filter((id) => id !== userId);

        // Union of project members + any additional explicit invitees, deduplicated
        memberIdsToAdd = [...new Set([...projectMemberIds, ...memberIdsToAdd])];
      }

      const ch = await tx.chatConversation.create({
        data: {
          workspaceId: input.workspaceId,
          projectId: input.projectId,
          name: input.name,
          topic: input.topic,
          type: "CHANNEL",
          members: {
            createMany: {
              data: [
                // Creator is always OWNER
                { userId, role: "MANAGER" },
                // All project members + explicit invitees as MEMBER
                ...memberIdsToAdd.map((id) => ({
                  userId: id,
                  role: "MEMBER" as const,
                })),
              ],
            },
          },
        },
      });
      return ch;
    });

    // 5. Finalize Lock (if applicable)
    if (lockKey && keys) {
      try {
        await LockingService.finalize(
          lockKey,
          keys.exists(normalizedSlug),
          "1",
          3600,
          userId,
          keys.userReservation(userId)
        );
      } catch (err) {
        // Log error but don't fail request
        logger.error("Failed to finalize channel lock", { err });
      }
    }

    return channel;
  } catch (error: any) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        throw AppError.conflict(
          "Channel with this name already exists in the project"
        );
      }
    }
    // Re-throw AppErrors
    if (error instanceof AppError) throw error;

    // Default fallback
    throw new AppError("Failed to create channel");
  }
};
