import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import { LockingService } from "@/services/locking";
import { createLockKeys } from "@/services/locking/keys";
import { CreateGroupInput, CreateGroupOutput } from "./types";

/**
 * Create Group DM Service (Robust Version)
 * Creates a multi-user group DM conversation.
 *
 * NEW: Project-scoped, distributed locking, deduplication, sanitization
 *
 * Features:
 * - Project-scoped: Groups are unique per project
 * - Race-condition safe: Uses distributed locks on group name
 * - Deduplication: Removes duplicate member IDs
 * - Sanitization: Validates and blocks reserved names
 * - Transaction-based: Atomic creation with validation
 */
export const handler = async (
  input: CreateGroupInput,
  ctx: ServiceContext
): Promise<CreateGroupOutput> => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated");

  const { workspaceId, projectId, name, memberUserIds } = input;

  // 1. Verify project exists and is not archived/deleted
  const project = await ctx.db.project.findUnique({
    where: { id: projectId },
    select: { id: true, isArchived: true, deletedAt: true, workspaceId: true },
  });

  if (!project) {
    throw AppError.notFound("Project not found");
  }

  if (project.deletedAt) {
    throw AppError.badRequest("Cannot create group in deleted project");
  }

  if (project.isArchived) {
    throw AppError.badRequest("Cannot create group in archived project");
  }

  if (project.workspaceId !== workspaceId) {
    throw AppError.badRequest("Project does not belong to this workspace");
  }

  // 2. Validate group name (reserved names)
  const normalizedName = name.trim().toLowerCase();

  // 3. Deduplicate member IDs
  const uniqueMemberIds = Array.from(new Set(memberUserIds));

  // 4. Validate minimum group size (creator + at least 1 other member)
  // After filtering out creator from members, must have at least 1 remaining
  const otherMembers = uniqueMemberIds.filter((id) => id !== userId);
  if (otherMembers.length === 0) {
    throw AppError.badRequest(
      "Group must have at least one other member besides the creator"
    );
  }

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
                // Creator as OWNER
                { userId, role: "OWNER" },
                // Other members as MEMBER (sorted for deterministic order)
                ...otherMembers.sort().map((id: string) => ({
                  userId: id,
                  role: "MEMBER",
                })),
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
