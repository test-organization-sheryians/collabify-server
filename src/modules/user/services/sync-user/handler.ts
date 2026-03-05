/**
 * syncUser — Service Handler (thin orchestrator)
 *
 * Steps:
 *   1. upsertUser       — $transaction: find by clerkId → update/revive
 *                                       find by email → guard conflict
 *                                       else → create new user
 *   2. updateUserCache  — Redis SET user:{id} (TTL: 5 min)
 *   3. emitWelcomeEvent — OutboxWriter at-most-once (swallows P2002)
 */
import { createLogger } from "@/shared/lib/logger";
import type { ServiceContext } from "@/graphql/types";
import type { SyncUserInput } from "./types";
import { upsertUser } from "./steps/upsert-user";
import { updateUserCache } from "./steps/update-user-cache";
import { emitWelcomeEvent } from "./steps/emit-welcome-event";

const logger = createLogger("user:services:sync-user");

export const syncUser = async (
  input: SyncUserInput,
  ctx: Pick<ServiceContext, "db" | "redis">
) => {
  const { db, redis } = ctx;

  const user = await upsertUser(input, db);
  await updateUserCache(user, redis);
  await emitWelcomeEvent(user, db);

  logger.info("syncUser complete", { userId: user.id });

  return user;
};
