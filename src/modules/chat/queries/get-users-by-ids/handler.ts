import { ServiceContext } from "@/graphql/types";
import type { GetUsersByIdsInput } from "./types";
import type { UserBasic } from "@/graphql/generated";

/**
 * Get Users By IDs Handler
 *
 * Batch fetches basic user information for multiple user IDs.
 * Used to populate member cache with message authors who may not be current conversation members.
 */
export const handler = async (
  input: GetUsersByIdsInput,
  ctx: ServiceContext
): Promise<UserBasic[]> => {
  const { userIds } = input;

  // Batch fetch users from database
  const users = await ctx.db.user.findMany({
    where: {
      id: { in: userIds },
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      avatarUrl: true,
    },
  });

  // Map to UserBasic type, ensuring fullName is never null
  return users.map((u) => ({
    id: u.id,
    fullName: u.fullName || "Unknown User",
    email: u.email,
    avatarUrl: u.avatarUrl,
  }));
};
