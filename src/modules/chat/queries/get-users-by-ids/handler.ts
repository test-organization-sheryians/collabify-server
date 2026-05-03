import { createLogger } from "@/shared/lib/logger";
import { AppError } from "@/shared/errors";
import type { ServiceContext } from "@/graphql/types";
import type { GetUsersByIdsInput } from "./schema";
import { fetchUsers } from "./steps/fetch-users";

const log = createLogger("chat:queries:get-users-by-ids");

/**
 * getUsersByIds — batch-fetches basic user info for multiple IDs.
 * Used to populate the member cache with message authors not in current conversation.
 *
 * Steps:
 *  1. Auth check  — userId guard only (per auth-api-inventory: 🔐 ws member, no scope assert)
 *  2. fetchUsers  — DB findMany with explicit select
 *  3. Map         — fullName ?? "Unknown User" (nullish, not falsy-collapse)
 *
 * @throws AppError 401  if not authenticated
 */
export const handler = async (
  input: GetUsersByIdsInput,
  ctx: ServiceContext
) => {
  if (!ctx.auth?.userId) throw AppError.unauthorized();

  try {
    const users = await fetchUsers(input.userIds, ctx);

    return users.map((u) => ({
      id: u.id,
      fullName: u.fullName ?? "Unknown User",
      email: u.email,
      avatarUrl: u.avatarUrl,
    }));
  } catch (err) {
    if (err instanceof AppError) throw err;
    log.error("[get-users-by-ids] Unexpected failure", { err });
    throw err;
  }
};
