import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import { Prisma } from "@prisma/client";
import { CreateChannelInput } from "./types";
import { LockingService, createLockKeys } from "@/services/locking";
import { SlugUtil } from "@/shared/utils/slug.util";
import { createLogger } from "@/shared/lib/logger";

const logger = createLogger("chat:services:create-channel");

export const handler = async (
  input: CreateChannelInput,
  ctx: ServiceContext
) => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated");

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

    // 1. Authorization: User must be a member of the workspace
    const membership = await ctx.db.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          userId,
          workspaceId: input.workspaceId,
        },
      },
    });

    if (!membership) {
      throw AppError.forbidden("You are not a member of this workspace");
    }

    // 2. Validate Project Integrity (if provided)
    if (input.projectId) {
      const project = await ctx.db.project.findUnique({
        where: { id: input.projectId },
        select: { workspaceId: true },
      });

      if (!project || project.workspaceId !== input.workspaceId) {
        throw AppError.badRequest("Invalid project ID for this workspace");
      }
    }

    // 3. Validate Member Integrity (if invited)
    if (input.memberUserIds?.length) {
      const validMembers = await ctx.db.workspaceMember.findMany({
        where: {
          workspaceId: input.workspaceId,
          userId: { in: input.memberUserIds },
        },
        select: { userId: true },
      });

      if (validMembers.length !== input.memberUserIds.length) {
        throw AppError.badRequest(
          "One or more invited users are not members of this workspace"
        );
      }
    }

    // 4. Create Channel
    const channel = await ctx.db.$transaction(async (tx) => {
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
                // Always add the creator as OWNER
                { userId, role: "OWNER" },
                // Add other invited members as MEMBER
                ...(input.memberUserIds
                  ?.filter((id) => id !== userId)
                  .map((id) => ({
                    userId: id,
                    role: "MEMBER",
                  })) || []),
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
