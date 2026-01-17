import { db } from "@/infra/db";
import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import { SlugUtil } from "@/shared/utils/slug.util";
import { Project } from "@prisma/client";

export const retrievalLogic = {
  getProjectsByUser: async (
    ctx: ServiceContext,
    workspaceId: string
  ): Promise<Project[]> => {
    // 0. Auth Check
    if (!ctx.auth.userId) {
      throw AppError.unauthorized("User not authenticated");
    }
    // Resolve Internal User ID
    const user = await ctx.dataloaders.user.userByClerkId.load(ctx.auth.userId);
    if (!user) {
      throw AppError.unauthorized("User account not found");
    }
    const userId = user.id;

    // 1. Get Member Records
    const members = await db.projectMember.findMany({
      where: {
        userId,
        workspaceId,
      },
      select: {
        projectId: true,
      },
      orderBy: { joinedAt: "desc" },
    });

    if (members.length === 0) {
      return [];
    }

    // 2. Extract IDs
    const projectIds = members.map((m) => m.projectId);

    // 3. Batch Fetch via DataLoader
    // loadMany returns (Project | Error)[], but we know IDs verify existence from member table (mostly)
    // We filter out any nulls or errors just in case of race condition deletions
    const results =
      await ctx.dataloaders.project.projectById.loadMany(projectIds);

    const projects: Project[] = [];
    for (const result of results) {
      if (result && !(result instanceof Error)) {
        projects.push(result);
      }
    }

    return projects;
  },

  getProjectBySlug: async (
    ctx: ServiceContext,
    workspaceId: string,
    slug: string
  ): Promise<Project | null> => {
    // 0. Auth Check
    if (!ctx.auth.userId) {
      throw AppError.unauthorized("User not authenticated");
    }
    // Resolve Internal User ID
    const user = await ctx.dataloaders.user.userByClerkId.load(ctx.auth.userId);
    if (!user) {
      throw AppError.unauthorized("User account not found");
    }
    const userId = user.id;

    const normalizedSlug = SlugUtil.sanitize(slug).toLowerCase();

    // 1. Fetch Project with Access Control
    const project = await db.project.findFirst({
      where: {
        workspaceId,
        key: normalizedSlug,
        members: {
          some: {
            userId,
          },
        },
      },
    });

    return project;
  },
};
