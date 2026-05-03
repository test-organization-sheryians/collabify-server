import type { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import { LockingService } from "@/services/locking";
import { createLockKeys } from "@/services/locking/keys";
import type { CreateGroupInput, CreateGroupOutput } from "../types";

/**
 * Executes raw Prisma logic constructing the group.
 * Isolates the `LockingService` wrapper preventing cross-creation overrides globally.
 */
export const create = async (
  input: CreateGroupInput,
  otherMembers: string[],
  normalizedName: string,
  ctx: ServiceContext
): Promise<CreateGroupOutput> => {
  const { workspaceId, projectId, name } = input;
  const userId = ctx.auth?.userId as string;

  // 5. Distributed Lock Setup (Project-Scoped, Name-Based)
  const lockKeys = createLockKeys("group", { type: "project", id: projectId });
  const lockKey = lockKeys.resource(normalizedName);

  // Try to acquire lock (10-second TTL)
  const lockAcquired = await LockingService.acquire(lockKey, userId, 10);

  if (!lockAcquired) {
    throw AppError.conflict(
      `Group with name "${name}" is already being created. Please choose a different name or wait.`
    );
  }

  try {
    // 6. Create group in transaction (with fresh validation)
    const group = await ctx.db.$transaction(async (tx) => {
      // Check if group name already exists (project-scoped)
      const existingGroup = await tx.chatConversation.findFirst({
        where: {
          projectId,
          type: "GROUP_DM",
          name,
        },
      });

      if (existingGroup) {
        throw AppError.conflict(
          `Group with name "${name}" already exists in this project`
        );
      }

      // Re-validate: Creator must be PROJECT member
      const creatorMembership = await tx.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId,
            userId,
          },
        },
      });

      if (!creatorMembership) {
        throw AppError.forbidden("You are not a member of this project");
      }

      // Re-validate: All members must be PROJECT members
      const allUserIds = [userId, ...otherMembers];
      const validMembers = await tx.projectMember.findMany({
        where: {
          projectId,
          userId: { in: allUserIds },
        },
        select: { userId: true },
      });

      if (validMembers.length !== allUserIds.length) {
        const validUserIdSet = new Set(validMembers.map((m) => m.userId));
        const invalidUsers = allUserIds.filter((id) => !validUserIdSet.has(id));
        throw AppError.badRequest(
          `The following users are not members of this project: ${invalidUsers.join(", ")}`
        );
      }

      // Create Group Conversation
      const newGroup = await tx.chatConversation.create({
        data: {
          workspaceId,
          projectId,
          type: "GROUP_DM",
          name,
          members: {
            createMany: {
              data: [
                // Creator
                { userId },
                // Other members (sorted for deterministic order)
                ...otherMembers.sort().map((id: string) => ({ userId: id })),
              ],
            },
          },
        },
      });

      return newGroup;
    });

    return group;
  } finally {
    // Always release lock
    await LockingService.release(lockKey, userId);
  }
};
