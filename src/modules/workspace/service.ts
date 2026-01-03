import { db } from "../../infra/db";
import { AppError } from "../../shared/errors";
import { logger } from "../../shared/logger";

export const WorkspaceService = {
  async getWorkspacesForUser(userId: string) {
    return db.workspace.findMany({
      where: {
        members: {
          some: { userId },
        },
        deletedAt: null,
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async getOnboardingStatus(userId: string) {
    const user = await db.user.findUnique({ where: { id: userId } });
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

  async createOnboardingWorkspace(userId: string, userFullName: string) {
    // 1. Check idempotency
    const existing = await this.getWorkspacesForUser(userId);
    if (existing.length > 0) {
      return existing[0];
    }

    // 2. Generate unique slug
    let baseName = userFullName.trim() || "My Workspace";
    let baseSlug = baseName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    if (!baseSlug) baseSlug = "workspace";

    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const existingSlug = await db.workspace.findUnique({ where: { slug } });
      if (!existingSlug) break;
      slug = `${baseSlug}-${counter}`;
      counter++;
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
