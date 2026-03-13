import { createLogger } from "@/shared/lib/logger";
import { AppError } from "@/shared/errors";
import type { ServiceContext } from "@/graphql/types";
import type { GetDmByUsersInput } from "./schema";
import { assertAccess } from "./steps/assert-access";
import { assertNotSelf } from "./steps/assert-not-self";
import { fetchDm } from "./steps/fetch-dm";
import { buildResponse } from "./steps/build-response";

const log = createLogger("chat:queries:get-dm-by-users");

/**
 * getDmByUsers — finds an existing DM conversation between the caller and another user.
 *
 * Steps:
 *  1. assertAccess    — authGate null-check (userId auth only, no scope gate needed)
 *  2. assertNotSelf   — guard: userId !== otherUserId
 *  3. fetchDm         — DB findFirst scoped to workspaceId + projectId + both members
 *  4. buildResponse   — pure mapping: DmRow → DmConversation GQL type (or null)
 *
 * Returns null when no DM exists — this is a valid, non-error response that tells
 * the client no prior DM exists and they may create one.
 *
 * @throws AppError 401  if ctx.authGate / ctx.permissions is missing
 * @throws AppError 400  if caller === otherUserId (self-DM attempt)
 */
export const handler = async (
  input: GetDmByUsersInput,
  ctx: ServiceContext
) => {
  try {
    await assertAccess(ctx);

    // Safe: assertAccess guarantees an authenticated session before reaching here.
    const userId = ctx.auth.userId!;
    assertNotSelf(userId, input.otherUserId);

    const dm = await fetchDm(input, userId, ctx);
    if (!dm) return null;

    return buildResponse(dm);
  } catch (err) {
    if (err instanceof AppError) throw err; // operational — pass through as-is
    log.error("[get-dm-by-users] Unexpected failure", { err, ...input });
    throw err; // non-operational — GraphQL layer returns INTERNAL_SERVER_ERROR
  }
};
