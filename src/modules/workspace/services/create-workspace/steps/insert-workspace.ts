/**
 * Create workspace and seed the owning user as OWNER member.
 * Handles Prisma unique-constraint (P2002) and FK (P2003) errors.
 */
import { AppError } from "@/shared/errors";
import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import type { Redis } from "ioredis";

export async function insertWorkspace(
  sanitizedName: string,
  normalizedSlug: string,
  userId: string,
  lockKey: string,
  db: PrismaClient,
  redis: Redis
) {
  try {
    return await db.$transaction(async (tx) => {
      return tx.workspace.create({
        data: {
          name: sanitizedName,
          slug: normalizedSlug,
          members: {
            create: { userId, role: "OWNER" },
          },
        },
      });
    });
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        await redis.del(lockKey);
        throw AppError.conflict(
          "Workspace URL is already taken.",
          "WORKSPACE_CREATION_DB_CONFLICT"
        );
      }
      if (error.code === "P2003") {
        await redis.del(lockKey);
        throw new AppError(
          "User account issue. Please re-login.",
          "UNAUTHORIZED",
          401
        );
      }
    }
    throw error;
  }
}
