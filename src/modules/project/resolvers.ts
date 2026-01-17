import { ServiceContext } from "@/graphql/types";
import { requireUser } from "@/shared/utils/graphql-helpers";
import { ProjectService } from "./service";
import { CreateProjectInput } from "./types";
import { AppError } from "@/shared/errors";

export const resolvers = {
  Project: {
    members: (parent: { id: string }, _args: unknown, ctx: ServiceContext) => {
      if (!ctx.dataloaders?.project?.membersByProjectId) {
        // Fallback if dataloader not registered yet or throw error
        throw new Error("Project DataLoaders not found in context");
      }
      return ctx.dataloaders.project.membersByProjectId.load(parent.id);
    },
  },
  Query: {
    myProjects: async (
      _: unknown,
      args: { workspaceId: string },
      ctx: ServiceContext
    ) => {
      await requireUser(ctx);
      return await ProjectService.getProjectsByUser(ctx, args.workspaceId);
    },
    project: async (_: unknown, args: { id: string }, ctx: ServiceContext) => {
      await requireUser(ctx);
      // Use DataLoader for efficiency and caching
      if (!ctx.dataloaders?.project?.projectById) {
        throw new Error("Project DataLoaders not found");
      }
      return ctx.dataloaders.project.projectById.load(args.id);
    },
    projectBySlug: async (
      _: unknown,
      args: { workspaceId: string; slug: string },
      ctx: ServiceContext
    ) => {
      await requireUser(ctx);
      return await ProjectService.getProjectBySlug(
        ctx,
        args.workspaceId,
        args.slug
      );
    },
  },
  Mutation: {
    checkProjectSlugAvailability: async (
      _: unknown,
      args: { workspaceId: string; slug: string },
      ctx: ServiceContext
    ) => {
      if (!ctx.auth.userId) throw AppError.unauthorized("Unauthorized");

      return await ProjectService.checkSlugAvailability({
        workspaceId: args.workspaceId,
        slug: args.slug,
        userId: ctx.auth.userId,
      });
    },
    createProject: async (
      _: unknown,
      args: { workspaceId: string; input: CreateProjectInput },
      ctx: ServiceContext
    ) => {
      await requireUser(ctx);
      return await ProjectService.createProject(
        ctx,
        args.workspaceId,
        args.input
      );
    },
  },
};
