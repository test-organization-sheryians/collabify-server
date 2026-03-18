/**
 * deleteAccount — Service Handler (thin orchestrator)
 *
 * Steps:
 *   1. verifyNotSoleOwnerAnywhere — BAD_REQUEST if sole owner of a workspace
 *   2. softDeleteUser             — set deletedAt = now
 */
import type { DeleteAccountInput } from "./schema";
import type { ServiceContext } from "@/graphql/types";
import { verifyNotSoleOwnerAnywhere } from "./steps/verify-not-sole-owner-anywhere";
import { softDeleteUser } from "./steps/soft-delete-user";

export const deleteAccount = async (
  input: DeleteAccountInput,
  ctx: ServiceContext
) => {
  const { userId } = input;
  const { db } = ctx;

  await verifyNotSoleOwnerAnywhere(userId, db);
  await softDeleteUser(userId, db);
  return true;
};
