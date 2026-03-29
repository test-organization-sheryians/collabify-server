import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import { CreateDmInput, CreateDmOutput } from "./types";

const log = createLogger("chat:services:create-dm");

/**
 * createDm — creates or returns an existing 1:1 DM conversation.
 *
 * Strategy: optimistic create with P2002 catch (lock-free, crash-safe).
 *   1. Compute a deterministic dmHash from sorted user IDs + projectId.
 *   2. Attempt chatConversation.create inside a transaction that also validates
 *      both users are active project members.
 *   3. On Prisma P2002 (unique constraint violation = DM already exists):
 *      fall back to findUnique(dmHash) and return the existing conversation.
 *
 * This replaces the previous LockingService approach which:
 *   - Could return AppError.conflict to the user on a race
 *   - Left locks held for 10 s on server crash
 *   - Did a full junction-table scan instead of an O(1) unique index lookup
 *
 * @throws AppError 401  if not authenticated
 * @throws AppError 400  if userId === recipientUserId (self-DM)
 * @throws AppError 400  if project deleted or archived
 * @throws AppError 403  if either user is not a project member
 */
export const handler = async (
  input: CreateDmInput,
  ctx: ServiceContext
): Promise<CreateDmOutput> => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated");
  if (!ctx.authGate || !ctx.permissions) throw AppError.unauthorized();

  const { workspaceId, projectId, recipientUserId } = input;

  // Guard: cannot DM yourself
  if (userId === recipientUserId) {
    throw AppError.badRequest("Cannot create DM with yourself");
  }

  // Auth: caller must be a project member with conversation:create
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

  // Validate project is active
  const project = await ctx.db.project.findUnique({
    where: { id: projectId },
    select: { id: true, isArchived: true, deletedAt: true, workspaceId: true },
  });

  if (!project) throw AppError.notFound("Project not found");
  if (project.deletedAt) throw AppError.badRequest("Cannot create DM in deleted project");
  if (project.isArchived) throw AppError.badRequest("Cannot create DM in archived project");
  if (project.workspaceId !== workspaceId) {
    throw AppError.badRequest("Project does not belong to this workspace");
  }

  // Deterministic hash — sorted so A↔B and B↔A produce the same key
  const [u1, u2] = [userId, recipientUserId].sort();
  const dmHash = `proj_${projectId}_${u1}_${u2}`;

  try {
    const dm = await ctx.db.$transaction(async (tx) => {
      // Re-validate inside transaction: both users must be active project members
      const projectMembers = await tx.projectMember.findMany({
        where: { projectId, userId: { in: [u1, u2] } },
        select: { userId: true },
      });

      if (projectMembers.length !== 2) {
        throw AppError.forbidden(
          "Both users must be members of this project to create a DM"
        );
      }

      return tx.chatConversation.create({
        data: {
          workspaceId,
          projectId,
          type: "DM",
          dmHash,
          members: {
            createMany: { data: [{ userId: u1 }, { userId: u2 }] },
          },
        },
      });
    });

    log.info("Created new DM conversation", { dmHash, conversationId: dm.id });
    return dm;
  } catch (err: any) {
    // P2002 = unique constraint violation: DM already exists (race condition resolved)
    if (err?.code === "P2002") {
      log.debug("Race resolved: DM already exists, returning existing", { dmHash });
      const existing = await ctx.db.chatConversation.findUnique({
        where: { dmHash },
      });
      if (existing) return existing;
    }
    throw err;
  }
};
