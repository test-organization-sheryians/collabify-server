import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import { LockingService } from "@/services/locking";
import { createLockKeys } from "@/services/locking/keys";
import { CreateDmInput, CreateDmOutput } from "./types";

/**
 * Create DM Service (Robust Version)
 * Creates a 1-on-1 direct message conversation between two users.
 *
 * NEW: Project-scoped, distributed locking, transaction-based
 *
 * Features:
 * - Idempotent: Returns existing DM if already exists
 * - Race-condition safe: Uses distributed locks
 * - Project-scoped: DMs are unique per project, not workspace
 * - Transaction-based: Atomic creation with validation
 */
export const handler = async (
  input: CreateDmInput,
  ctx: ServiceContext
): Promise<CreateDmOutput> => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated");
  if (!ctx.authGate || !ctx.permissions) throw AppError.unauthorized();

  const { workspaceId, projectId, recipientUserId } = input;

  // Validate: Cannot DM yourself
  if (userId === recipientUserId) {
    throw AppError.badRequest("Cannot create DM with yourself");
  }

  // Step 0 — project member gate (cache-backed)
  const proj = await ctx.authGate.getProject(projectId);
  const scope = {
    type: "project" as const,
    id: projectId,
    workspaceId: proj?.workspaceId ?? workspaceId,
  };
  await Promise.all([
    ctx.authGate.assertProjectMember(projectId),
    ctx.permissions.assert("conversation:create", scope),
  ]);

  // 1. Verify project exists and is not archived/deleted
  const project = await ctx.db.project.findUnique({
    where: { id: projectId },
    select: { id: true, isArchived: true, deletedAt: true, workspaceId: true },
  });

  if (!project) {
    throw AppError.notFound("Project not found");
  }

  if (project.deletedAt) {
    throw AppError.badRequest("Cannot create DM in deleted project");
  }

  if (project.isArchived) {
    throw AppError.badRequest("Cannot create DM in archived project");
  }

  if (project.workspaceId !== workspaceId) {
    throw AppError.badRequest("Project does not belong to this workspace");
  }

  // 2. Distributed Lock Setup (Project-Scoped)
  // Sort users to ensure deterministic lock key
  const [user1, user2] = [userId, recipientUserId].sort();

  const lockKeys = createLockKeys("dm", { type: "project", id: projectId });
  const lockKey = lockKeys.resource(`${user1}:${user2}`);

  // Try to acquire lock (10-second TTL)
  const lockAcquired = await LockingService.acquire(lockKey, userId, 10);

  if (!lockAcquired) {
    throw AppError.conflict(
      "DM creation already in progress for these users. Please wait and try again."
    );
  }

  try {
    // 3. Idempotent Check: Find existing DM (PROJECT-SCOPED)
    const existingDm = await ctx.db.chatConversation.findFirst({
      where: {
        workspaceId,
        projectId,
        type: "DM",
        AND: [
          { members: { some: { userId: user1 } } },
          { members: { some: { userId: user2 } } },
        ],
      },
    });

    if (existingDm) {
      // DM already exists, return it
      return existingDm;
    }

    // 4. Create DM in Transaction (with fresh validation)
    const dm = await ctx.db.$transaction(async (tx) => {
      // Re-validate: Both users must be PROJECT members (not just workspace)
      const projectMembers = await tx.projectMember.findMany({
        where: {
          projectId,
          userId: { in: [user1, user2] },
        },
        select: { userId: true },
      });

      if (projectMembers.length !== 2) {
        throw AppError.forbidden(
          "Both users must be members of this project to create a DM"
        );
      }

      // Create DM Conversation
      const newDm = await tx.chatConversation.create({
        data: {
          workspaceId,
          projectId,
          type: "DM",
          // DMs have no name
          members: {
            createMany: {
              data: [{ userId: user1 }, { userId: user2 }],
            },
          },
        },
      });

      return newDm;
    });

    return dm;
  } finally {
    // Always release lock
    await LockingService.release(lockKey, userId);
  }
};
