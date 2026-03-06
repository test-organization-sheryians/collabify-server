/**
 * getPublicUser — Query Handler
 *
 * Returns public profile fields for any user. No auth guard needed;
 * caller must be authenticated (enforced at resolver level).
 */
import { AppError } from "@/shared/errors";
import type { GetPublicUserInput } from "./schema";
import type { ServiceContext } from "@/graphql/types";

export const getPublicUser = async (
  input: GetPublicUserInput,
  ctx: ServiceContext
) => {
  const { userId } = input;
  const { db } = ctx;

  const user = await db.user.findUnique({
    where: { id: userId, deletedAt: null },
    select: { id: true, fullName: true, avatarUrl: true, email: true },
  });

  if (!user) throw AppError.notFound("User not found");
  return user;
};
