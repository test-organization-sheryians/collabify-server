import { Resolvers } from "@/graphql/generated";
import { AppError } from "@/shared/errors";
import { requireUser } from "@/shared/utils/graphql-helpers";
import {
  createProject,
  CreateProjectSchema,
  checkSlugAvailability,
  CheckSlugAvailabilitySchema,
} from "../../services";
import {
  getMyProjects,
  GetMyProjectsSchema,
  getProjectById,
  GetProjectByIdSchema,
  getProjectBySlug,
  GetProjectBySlugSchema,
} from "../../queries";

export const resolvers: Resolvers = {
  Project: {
    members: (parent, _args, ctx) => {
      if (!ctx.dataloaders?.project?.membersByProjectId) {
        throw new Error("Project DataLoaders not found in context");
      }
      return ctx.dataloaders.project.membersByProjectId.load(parent.id);
    },
  },
  Query: {
    myProjects: async (_, args, ctx) => {
      await requireUser(ctx);
      const input = {
        ...args,
        userId: ctx.auth.userId,
      };

      const data = GetMyProjectsSchema.parse(input);
      return getMyProjects(ctx, data);
    },
    project: async (_, args, ctx) => {
      await requireUser(ctx);
      const data = GetProjectByIdSchema.parse(args);
      return getProjectById(ctx, data);
    },
    projectBySlug: async (_, args, ctx) => {
      await requireUser(ctx);
      const input = {
        ...args,
        userId: ctx.auth.userId,
      };
      const data = GetProjectBySlugSchema.parse(input);
      return getProjectBySlug(data);
    },
  },
  Mutation: {
    checkProjectSlugAvailability: async (_, args, ctx) => {
      if (!ctx.auth.userId) throw AppError.unauthorized("Unauthorized");

      const input = {
        ...args,
        userId: ctx.auth.userId,
      };

      const data = CheckSlugAvailabilitySchema.parse(input);
      return checkSlugAvailability(data);
    },
    createProject: async (_, args, ctx) => {
      await requireUser(ctx);

      const data = CreateProjectSchema.parse(args.input);

      return createProject({
        workspaceId: args.workspaceId,
        input: data,
        userId: ctx.auth.userId!,
      });
    },
  },
};
