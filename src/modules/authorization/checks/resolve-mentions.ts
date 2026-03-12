import type { Redis } from "ioredis";
import type { PrismaClient } from "@prisma/client";
import type { MentionedUser } from "../types/auth-gate-types";
import { getUsersByIds } from "./get-users-by-ids";
import { isWorkspaceMember } from "./is-workspace-member";

/**
 * resolveMentions — resolves @mention handles to full user objects.
 *
 * The User model has no 'username' field. Handles are resolved by email.
 * (If the schema later adds a username field, update the where clause.)
 *
 * Steps:
 *   1. Lookup users by email (handles treated as email addresses)
 *   2. Batch-fetch profiles via getUsersByIds (cache-backed)
 *   3. For each user, check workspace membership (cache-backed)
 *   4. Return MentionedUser[] with isWorkspaceMember flag
 */
export async function resolveMentions(
  handles: string[],
  workspaceId: string,
  redis: Redis,
  db: PrismaClient
): Promise<MentionedUser[]> {
  if (handles.length === 0) return [];

  // 1. Resolve handles → user IDs by email
  const users = await db.user.findMany({
    where: { email: { in: handles } },
    select: { id: true },
  });

  const userIds = users.map((u) => u.id);
  if (userIds.length === 0) return [];

  // 2. Batch profile fetch (cache-backed)
  const profiles = await getUsersByIds(userIds, redis, db);

  // 3. For each user check workspace membership (cache-backed)
  const results = await Promise.all(
    profiles.map(async (profile): Promise<MentionedUser> => {
      const isMember = await isWorkspaceMember(
        workspaceId,
        profile.id,
        redis,
        db
      );
      return { ...profile, isWorkspaceMember: isMember };
    })
  );

  return results;
}
