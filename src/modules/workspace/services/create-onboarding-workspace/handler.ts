/**
 * createOnboardingWorkspace — Service Handler (thin orchestrator)
 *
 * Steps:
 *   1. acquireOnboardingLock  — Redis mutex to prevent duplicate concurrent creation
 *   2. checkIdempotency       — return existing workspace if user already has one
 *   3. findAvailableSlug      — retry loop (up to 5): check + reserve slug
 *   4. createWorkspace        — delegated to create-workspace service (lock already held)
 */
import { createLogger } from "@/shared/lib/logger";
import { LockingService } from "@/services/locking";
import type { CreateOnboardingWorkspaceInput } from "./types";
import type { ServiceContext } from "@/graphql/types";
import { acquireOnboardingLock } from "./steps/acquire-onboarding-lock";
import { checkIdempotency } from "./steps/check-idempotency";
import { findAvailableSlug } from "./steps/find-available-slug";
import { createWorkspace } from "../create-workspace";

const logger = createLogger("workspace:services:create-onboarding-workspace");

export const createOnboardingWorkspace = async (
  input: CreateOnboardingWorkspaceInput,
  ctx: ServiceContext
) => {
  const { userId, userFullName, slug } = input;
  const { redis } = ctx;

  const userLockKey = await acquireOnboardingLock(userId, redis);

  try {
    const existingWorkspace = await checkIdempotency(userId, ctx);
    if (existingWorkspace) return existingWorkspace;

    const finalSlug = await findAvailableSlug(userId, userFullName, slug, ctx);

    logger.info("Onboarding slug resolved", { userId, slug: finalSlug });

    return createWorkspace(
      { userId, name: `${userFullName}'s Workspace`, slug: finalSlug },
      ctx
    );
  } finally {
    await LockingService.release(userLockKey, "1");
  }
};
