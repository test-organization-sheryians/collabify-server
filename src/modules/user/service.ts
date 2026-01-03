import { db } from "../../infra/db";

const prisma = db;

export const UserService = {
  async findUserByClerkId(clerkId: string) {
    const key = await prisma.userKey.findUnique({
      where: {
        provider_providerId: {
          provider: "clerk",
          providerId: clerkId,
        },
      },
      include: {
        user: true,
      },
    });
    return key?.user || null;
  },

  async createUserFromClerk(data: {
    clerkId: string;
    email: string;
    fullName?: string;
    avatarUrl?: string;
  }) {
    return prisma.$transaction(async (tx) => {
      // Check if user exists by email to prevent dupes (link account scenario)
      let user = await tx.user.findUnique({ where: { email: data.email } });

      if (!user) {
        user = await tx.user.create({
          data: {
            email: data.email,
            fullName: data.fullName,
            avatarUrl: data.avatarUrl,
            status: "ACTIVE",
          },
        });
      }

      // Create Key
      await tx.userKey.create({
        data: {
          userId: user.id,
          provider: "clerk",
          providerId: data.clerkId,
        },
      });

      return user;
    });
  },

  async findUserById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  },
};
