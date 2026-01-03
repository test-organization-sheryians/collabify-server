import { db } from "../../infra/db";
import { SyncUserSchema } from "./types";

// const prisma = db; // Removed alias

export const UserService = {
  async findUserByClerkId(clerkId: string) {
    return db.user.findUnique({
      where: { clerkId, deletedAt: null },
    });
  },

  async syncUserFromClerk(rawInput: unknown) {
    const data = SyncUserSchema.parse(rawInput);

    return db.$transaction(async (tx) => {
      // 1. Try to find by Clerk ID
      const existingUser = await tx.user.findUnique({
        where: { clerkId: data.clerkId },
      });

      if (existingUser) {
        // Update existing user
        return tx.user.update({
          where: { id: existingUser.id },
          data: {
            email: data.email,
            fullName: data.fullName,
            avatarUrl: data.avatarUrl,
            status: "ACTIVE",
          },
        });
      }

      // 2. Try to find by Email (Account Linking)
      const existingByEmail = await tx.user.findUnique({
        where: { email: data.email },
      });

      if (existingByEmail) {
        // Link the existing user to this Clerk ID
        return tx.user.update({
          where: { id: existingByEmail.id },
          data: {
            clerkId: data.clerkId,
            fullName: data.fullName || existingByEmail.fullName,
            avatarUrl: data.avatarUrl || existingByEmail.avatarUrl,
            status: "ACTIVE",
          },
        });
      }

      // 3. Create new user
      return tx.user.create({
        data: {
          clerkId: data.clerkId,
          email: data.email,
          fullName: data.fullName,
          avatarUrl: data.avatarUrl,
          status: "ACTIVE",
        },
      });
    });
  },

  async findUserById(id: string) {
    return db.user.findUnique({
      where: { id, deletedAt: null },
    });
  },
};
