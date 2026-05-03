import { createLogger } from "@/shared/lib/logger";
import { AppError } from "@/shared/errors";
import type { ServiceContext } from "@/graphql/types";
import type { GetProjectDmsInput } from "./schema";
import { fetchProjectDms } from "./steps/fetch-project-dms";
import { assertAccess } from "./steps/assert-access";

const log = createLogger("chat:queries:get-project-dms");

/**
 * getProjectDms — returns all 1:1 DMs the caller is a member of in a project.
 *
 * Each item resolves the other participant's profile (name, avatar) and the
 * unread count so the sidebar can render without additional round-trips.
 *
 * Steps:
 *  1. Auth gate: caller must be authenticated + project member
 *  2. fetchProjectDms: DB findMany scoped to (projectId, userId, type=DM)
 *  3. Map: derive otherUser + unreadCount per DM
 *
 * @throws AppError 401  if not authenticated
 * @throws AppError 403  if not a project member
 */
export const handler = async (
  input: GetProjectDmsInput,
  ctx: ServiceContext
) => {
  const userId = ctx.auth.userId;
  if (!userId) throw AppError.unauthorized("User not authenticated");
  if (!ctx.authGate) throw AppError.unauthorized();

  try {
    // Auth gate via delegated step
    await assertAccess(input.projectId, input.workspaceId, ctx);

    const rows = await fetchProjectDms(input, userId, ctx);

    // Batch load all unread counts in a single O(1) query
    const channelIds = rows.map((dm) => dm.id);
    const unreadCounts = await ctx.dataloaders.chat.unreadMessageCountByChannelId.loadMany(channelIds);

    return rows.map((dm, i) => {
      // Identify the other participant (the one who isn't the caller)
      const otherMember = dm.members.find((m) => m.userId !== userId);

      // Extract the correctly matched count
      const unreadCountResult = unreadCounts[i];
      const unreadCount = unreadCountResult instanceof Error ? 0 : (unreadCountResult as number);

      return {
        id: dm.id,
        otherUser: {
          id: otherMember?.user?.id ?? "",
          fullName: otherMember?.user?.fullName ?? "Deleted User",
          email: otherMember?.user?.email ?? null,
          avatarUrl: otherMember?.user?.avatarUrl ?? null,
        },
        unreadCount,
        updatedAt: dm.updatedAt.toISOString(),
      };
    });
  } catch (err) {
    if (err instanceof AppError) throw err;
    log.error("[get-project-dms] Unexpected failure", { err, ...input });
    throw err;
  }
};
