import { db } from "../../infra/db";

const prisma = db;

export const UserService = {
  async findUserByClerkId(clerkId: string) {
    return prisma.user.findUnique({
      where: { clerkId },
    });
  },

  async syncUserFromClerk(data: {
    clerkId: string;
    email: string;
    fullName?: string;
    avatarUrl?: string;
  }) {
    return prisma.$transaction(async (tx) => {
      // 1. Try to find by Clerk ID (Update Schema)
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
            status: "ACTIVE", // Reactivate if needed
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
    return prisma.user.findUnique({ where: { id } });
  },
};
