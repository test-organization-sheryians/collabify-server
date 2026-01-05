import { db } from "@/infra/db";
import { logger } from "@/shared/logger";
import { AppError } from "@/shared/errors";
import { QuotaService } from "@/modules/quota/service";
import { UserIdSchema, CreateOnboardingWorkspaceSchema } from "../types";

export const OnboardingLogic = {
  async getOnboardingStatus(input: { userId: string }) {
    const { userId } = UserIdSchema.parse(input);
    const user = await db.user.findUnique({
      where: { id: userId, deletedAt: null },
    });
    if (!user) {
      return {
        hasUser: false,
        hasWorkspace: false,
        hasProject: false,
        workspaceSlug: null,
      };
    }

    const firstWorkspace = await db.workspace.findFirst({
      where: {
        members: { some: { userId } },
        deletedAt: null,
      },
      include: {
        projects: {
          where: {
            members: { some: { userId } },
            deletedAt: null,
          },
          take: 1,
        },
      },
    });

    if (!firstWorkspace) {
      return {
        hasUser: true,
        hasWorkspace: false,
        hasProject: false,
        workspaceSlug: null,
      };
    }

    return {
      hasUser: true,
      hasWorkspace: true,
      hasProject: firstWorkspace.projects.length > 0,
      workspaceSlug: firstWorkspace.slug,
    };
  },

  async createOnboardingWorkspace(input: {
    userId: string;
    userFullName: string;
  }) {
    const { userId, userFullName } =
      CreateOnboardingWorkspaceSchema.parse(input);

    await QuotaService.enforceQuota(userId, "MAX_OWNED_WORKSPACES");

    // 1. Check idempotency
    const existing = await db.workspace.findMany({
      where: {
        members: {
          some: { userId },
        },
        deletedAt: null,
      },
    });

    if (existing.length > 0) {
      return existing[0];
    }

    // 2. Generate unique slug
    const baseName = userFullName.trim() || "My Workspace";
    let baseSlug = baseName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    if (!baseSlug) baseSlug = "workspace";

    let slug = baseSlug;
    let counter = 1;
    const MAX_RETRIES = 10;
    let attempts = 0;

    while (true) {
      if (attempts >= MAX_RETRIES) {
        throw new AppError("Could not generate unique workspace slug");
      }

      const existingSlug = await db.workspace.findUnique({ where: { slug } });
      if (!existingSlug) break;

      slug = `${baseSlug}-${counter}`;
      counter++;
      attempts++;
    }

    // 3. Create Workspace
    const workspace = await db.workspace.create({
      data: {
        name: `${baseName}'s Workspace`,
        slug: slug,
        members: {
          create: {
            userId: userId,
            role: "OWNER",
          },
        },
      },
    });

    logger.info(
      { workspaceId: workspace.id, userId },
      "Created Onboarding Workspace"
    );
    return workspace;
  },
};
