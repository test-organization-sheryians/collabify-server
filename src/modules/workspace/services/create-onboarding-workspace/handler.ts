import { createLogger } from "@/shared/lib/logger";

const logger = createLogger("workspace:services:onboarding");
import { AppError } from "@/shared/errors";
import { CreateOnboardingWorkspaceInput } from "./types";
import { SlugUtil } from "@/shared/utils/slug.util";
import { getMyWorkspaces } from "../../queries/get-my-workspaces";
import { checkSlugAvailability } from "../check-slug-availability";
import { createWorkspace } from "../create-workspace";
import { ServiceContext } from "@/graphql/types";
import { LockingService, createLockKeys } from "@/services/locking";

export const createOnboardingWorkspace = async (
  input: CreateOnboardingWorkspaceInput,
  ctx: ServiceContext
) => {
  const { userId, userFullName, slug } = input;
  const { redis } = ctx;
  const keys = createLockKeys("workspace");

  // 0. User Mutex (The "Turnstile")
  // Prevents concurrent requests from same user creating double workspaces.
  const userLockKey = keys.resource(`onboarding:${userId}`);
  const acquired = await LockingService.acquire(userLockKey, "1", 10);

  if (!acquired) {
    throw AppError.conflict(
      "Onboarding is already in progress. Please wait.",
      "IDEMPOTENCY_LOCKED"
    );
  }

  try {
    // 1. Check Idempotency (Strict)
    const existing = await getMyWorkspaces({ userId }, ctx);
    if (existing.length > 0) {
      logger.info("Onboarding Idempotency: Workspace already exists", {
        userId,
        workspaceId: existing[0].id,
      });
      return existing[0];
    }

    // 2. Slug Generation Loop
    const MAX_RETRIES = 5;
    let attempts = 0;

    // If user provided a custom slug, use it first.
    // Otherwise sanitize name.
    const baseSlug = slug || SlugUtil.sanitize(userFullName) || "workspace";
    let finalSlug: string | null = null;

    while (attempts < MAX_RETRIES) {
      const candidateSlug =
        slug && attempts === 0
          ? slug // 1st try: exact custom slug
          : SlugUtil.generateNext(baseSlug, attempts);

      // Check availability (This also RESERVES the lock if available)
      const check = await checkSlugAvailability(
        {
          slug: candidateSlug,
          userId,
        },
        ctx
      );

      if (check.available) {
        finalSlug = candidateSlug;
        break;
      }

      // If custom slug failed on first try, don't suffix it (UX decision).
      // Fallback to name-based generation?
      // Decision: If custom slug fails, we FAIL fast per requirements (don't suffix custom input).
      if (slug && attempts === 0) {
        throw AppError.conflict(
          `The slug '${slug}' is unavailable. Please choose another.`,
          "WORKSPACE_ONBOARDING_CUSTOM_SLUG_TAKEN"
        );
      }

      attempts++;
    }

    if (!finalSlug) {
      throw new AppError(
        "Could not generate a unique workspace URL. Please try again.",
        "WORKSPACE_ONBOARDING_SLUG_GENERATION_FAILED"
      );
    }

    // 3. Create Workspace (Delegated)
    // Lock is ALREADY held by 'checkSlugAvailability'
    return await createWorkspace(
      {
        userId,
        name: userFullName + "'s Workspace",
        slug: finalSlug,
      },
      ctx
    );
  } finally {
    // Always release the turnstile
    await LockingService.release(userLockKey, "1");
  }
};
