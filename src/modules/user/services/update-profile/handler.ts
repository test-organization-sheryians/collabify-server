/**
 * updateProfile — Service Handler (thin orchestrator)
 *
 * Steps:
 *   1. updateUserFields — update fullName/avatarUrl; throw NOT_FOUND if missing
 */
import type { UpdateProfileInput } from "./schema";
import type { ServiceContext } from "@/graphql/types";
import { updateUserFields } from "./steps/update-user-fields";

export const updateProfile = async (
  input: UpdateProfileInput,
  ctx: ServiceContext
) => {
  const { userId, fullName, avatarUrl, bio, timezone, language } = input;
  const { db } = ctx;

  return updateUserFields(userId, { fullName, avatarUrl, bio, timezone, language }, db);
};
