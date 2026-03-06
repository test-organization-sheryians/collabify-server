import DataLoader from "dataloader";
import { db } from "@/infra/db";

/**
 * User Loader - Batch user lookups by ID
 * Used by Whiteboard.creator field resolver
 */

// Subset of User fields needed for GraphQL UserBasic type
export type UserBasic = {
  id: string;
  fullName: string | null;
  email: string;
  avatarUrl: string | null;
};

export const createUserByIdLoader = () =>
  new DataLoader<string, UserBasic | null>(async (userIds) => {
    const users = await db.user.findMany({
      where: { id: { in: [...userIds] } },
      select: {
        id: true,
        fullName: true,
        email: true,
        avatarUrl: true,
      },
    });

    const userMap = new Map(users.map((user) => [user.id, user]));
    return userIds.map((id) => userMap.get(id) || null);
  });
