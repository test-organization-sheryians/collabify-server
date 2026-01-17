import { redis } from "@/infra/redis";
import { logger } from "@/shared/logger";
import { AppError } from "@/shared/errors";
import { CreateOnboardingWorkspaceSchema, UserIdSchema } from "../types";
import { RetrievalLogic } from "./retrieval";
import { creationLogic } from "./creation";
import { SlugLogic } from "./slug";
import { SlugUtil } from "@/shared/utils/slug.util";
import { db } from "@/infra/db";

export const OnboardingLogic = {
  async getOnboardingStatus(input: { userId: string }) {
    const { userId } = UserIdSchema.parse(input);

    // 1. Check User Existence (Strict)
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return {
        hasUser: false,
        hasWorkspace: false,
        hasProject: false,
        workspaceSlug: null,
      };
    }

    const workspaces = await RetrievalLogic.getWorkspacesForUser({ userId });

    if (workspaces.length === 0) {
      return {
        hasUser: true, // Assuming user exists at this point
        hasWorkspace: false,
        hasProject: false,
        workspaceSlug: null,
      };
    }

    const firstWorkspace = workspaces[0];
    return {
      hasUser: true,
      hasWorkspace: true,
      hasProject: false,
      workspaceSlug: firstWorkspace.slug,
    };
  },

  async createOnboardingWorkspace(input: {
    userId: string;
    userFullName: string;
    slug?: string;
  }) {
    const { userId, userFullName, slug } =
      CreateOnboardingWorkspaceSchema.parse(input);

    // 0. User Mutex (The "Turnstile")
    // Prevents concurrent requests from same user creating double workspaces.
    const userLockKey = `lock:onboarding:${userId}`;
    const acquired = await redis.set(userLockKey, "1", "EX", 10, "NX");

    if (!acquired) {
      throw AppError.conflict(
        "Onboarding is already in progress. Please wait.",
        "IDEMPOTENCY_LOCKED"
      );
    }

    try {
      // 1. Check Idempotency (Strict)
      const existing = await RetrievalLogic.getWorkspacesForUser({ userId });
      if (existing.length > 0) {
        logger.info(
          { userId, workspaceId: existing[0].id },
          "Onboarding Idempotency: Workspace already exists"
        );
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
        const check = await SlugLogic.checkSlugAvailability({
          slug: candidateSlug,
          userId,
        });

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
      return await creationLogic.createWorkspace({
        userId,
        name: userFullName + "'s Workspace",
        slug: finalSlug,
      });
    } finally {
      // Always release the turnstile
      await redis.del(userLockKey);
    }
  },
};
