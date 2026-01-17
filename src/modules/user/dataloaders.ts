import DataLoader from "dataloader";
import { db } from "../../infra/db";
import { User } from "@prisma/client";

export const createUserLoaders = () => ({
  userById: new DataLoader<string, User | null>(async (ids) => {
    const users = await db.user.findMany({
      where: {
        id: { in: [...ids] },
        deletedAt: null,
      },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));
    return ids.map((id) => userMap.get(id) || null);
  }),
});

export type UserLoaders = ReturnType<typeof createUserLoaders>;
