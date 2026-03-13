import type { ServiceContext } from "@/graphql/types";

/**
 * fetchUsers — batch-fetches basic user info by IDs.
 * Returns only the fields needed for the UserBasic GQL type.
 */
export async function fetchUsers(userIds: string[], ctx: ServiceContext) {
  return ctx.db.user.findMany({
    where: { id: { in: userIds } },
    select: {
      id: true,
      fullName: true,
      email: true,
      avatarUrl: true,
    },
  });
}
