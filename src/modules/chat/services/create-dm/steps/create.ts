import type { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { CreateDmInput, CreateDmOutput } from "../types";
import { emit } from "@/modules/notification/outbox/outbox-writer";

const log = createLogger("chat:services:create-dm:create");

/**
 * Executes raw Prisma logic constructing the DM conversation natively.
 * Enacts a P2002 safe recovery. 
 */
export const create = async (
  input: CreateDmInput,
  ctx: ServiceContext
): Promise<CreateDmOutput> => {
  const { workspaceId, projectId, recipientUserId } = input;
  const userId = ctx.auth?.userId as string;

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

      const conversation = await tx.chatConversation.create({
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

      await emit(tx, {
        type: "chat.dm.created",
        payload: {
          conversationId: conversation.id,
          workspaceId,
          workspaceSlug: "",
          recipientId: recipientUserId,
          actorId: ctx.auth?.userId ?? "",
          actorName: "Someone",
          firstMessagePreview: "",
        } as any,
        deduplicationId: `chat.dm.created:${conversation.id}:${Date.now()}`,
      });

      return conversation;
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
