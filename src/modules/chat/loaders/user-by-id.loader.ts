import DataLoader from "dataloader";
import type { ApplicationContext } from "@/graphql/types";
import type { User } from "@prisma/client";

/**
 * Batch load users by their IDs
 */
const batchUsers = async (
  ids: readonly string[],
  ctx: ApplicationContext
): Promise<(User | null)[]> => {
  const users = await ctx.db.user.findMany({
    where: {
      id: { in: [...ids] },
      deletedAt: null,
    },
  });

  const userMap = new Map(users.map((u: User) => [u.id, u]));
  return ids.map((id) => userMap.get(id) ?? null);
};

/**
 * Create user-by-id dataloader
 */
export const createUserByIdLoader = (ctx: ApplicationContext) =>
  new DataLoader<string, User | null>((ids) => batchUsers(ids, ctx));
