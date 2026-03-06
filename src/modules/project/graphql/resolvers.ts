import { Resolvers } from "@/graphql/generated";
import { AppError } from "@/shared/errors";
import { requireUser } from "@/shared/utils/graphql-helpers";
import {
  createProject,
  CreateProjectSchema,
  checkSlugAvailability,
  CheckSlugAvailabilitySchema,
  updateProject,
  UpdateProjectSchema,
  addProjectMember,
  AddProjectMemberSchema,
  removeProjectMember,
  RemoveProjectMemberSchema,
  updateProjectMemberRole,
  UpdateProjectMemberRoleSchema,
  archiveProject,
  ArchiveProjectSchema,
  unarchiveProject,
  UnarchiveProjectSchema,
  deleteProject,
  DeleteProjectSchema,
  leaveProject,
  LeaveProjectSchema,
} from "../services";
import {
  getMyProjects,
  GetMyProjectsSchema,
  getProjectById,
  GetProjectByIdSchema,
  getProjectBySlug,
  GetProjectBySlugSchema,
  getProjectMembers,
  GetProjectMembersSchema,
} from "../queries";

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
      const input = { ...args, userId: ctx.auth.userId };
      const data = GetMyProjectsSchema.parse(input);
      return getMyProjects(data, ctx);
    },
    project: async (_, args, ctx) => {
      await requireUser(ctx);
      const data = GetProjectByIdSchema.parse(args);
      return getProjectById(data, ctx);
    },
    projectBySlug: async (_, args, ctx) => {
      await requireUser(ctx);
      const input = { ...args, userId: ctx.auth.userId };
      const data = GetProjectBySlugSchema.parse(input);
      return getProjectBySlug(data, ctx);
    },

    projectMembers: async (_, args, ctx) => {
      if (!ctx.auth.userId) throw AppError.unauthorized("Unauthorized");
      const data = GetProjectMembersSchema.parse({
        projectId: args.projectId,
        actorUserId: ctx.auth.userId,
      });
      return getProjectMembers(data, ctx);
    },
  },
  Mutation: {
    checkProjectSlugAvailability: async (_, args, ctx) => {
      if (!ctx.auth.userId) throw AppError.unauthorized("Unauthorized");
      const input = { ...args, userId: ctx.auth.userId };
      const data = CheckSlugAvailabilitySchema.parse(input);
      return checkSlugAvailability(data, ctx);
    },
    createProject: async (_, args, ctx) => {
      await requireUser(ctx);
      const data = CreateProjectSchema.parse(args.input);
      return createProject(
        {
          workspaceId: args.workspaceId,
          input: data,
          userId: ctx.auth.userId!,
        },
        ctx
      );
    },

    updateProject: async (_, args, ctx) => {
      if (!ctx.auth.userId) throw AppError.unauthorized("Unauthorized");
      const data = UpdateProjectSchema.parse({
        projectId: args.projectId,
        actorUserId: ctx.auth.userId,
        ...args.input,
      });
      return updateProject(data, ctx);
    },

    addProjectMember: async (_, args, ctx) => {
      if (!ctx.auth.userId) throw AppError.unauthorized("Unauthorized");
      const data = AddProjectMemberSchema.parse({
        projectId: args.projectId,
        workspaceId: args.workspaceId,
        actorUserId: ctx.auth.userId,
        targetUserId: args.userId,
      });
      return addProjectMember(data, ctx);
    },

    removeProjectMember: async (_, args, ctx) => {
      if (!ctx.auth.userId) throw AppError.unauthorized("Unauthorized");
      const data = RemoveProjectMemberSchema.parse({
        projectId: args.projectId,
        workspaceId: args.workspaceId,
        actorUserId: ctx.auth.userId,
        targetUserId: args.userId,
      });
      return removeProjectMember(data, ctx);
    },

    updateProjectMemberRole: async (_, args, ctx) => {
      if (!ctx.auth.userId) throw AppError.unauthorized("Unauthorized");
      const data = UpdateProjectMemberRoleSchema.parse({
        projectId: args.projectId,
        workspaceId: args.workspaceId,
        actorUserId: ctx.auth.userId,
        targetUserId: args.userId,
        roleId: args.roleId,
      });
      return updateProjectMemberRole(data, ctx);
    },

    archiveProject: async (_, args, ctx) => {
      if (!ctx.auth.userId) throw AppError.unauthorized("Unauthorized");
      const data = ArchiveProjectSchema.parse({
        projectId: args.projectId,
        actorUserId: ctx.auth.userId,
      });
      return archiveProject(data, ctx);
    },

    unarchiveProject: async (_, args, ctx) => {
      if (!ctx.auth.userId) throw AppError.unauthorized("Unauthorized");
      const data = UnarchiveProjectSchema.parse({
        projectId: args.projectId,
        actorUserId: ctx.auth.userId,
      });
      return unarchiveProject(data, ctx);
    },

    deleteProject: async (_, args, ctx) => {
      if (!ctx.auth.userId) throw AppError.unauthorized("Unauthorized");
      const data = DeleteProjectSchema.parse({
        projectId: args.projectId,
        actorUserId: ctx.auth.userId,
      });
      return deleteProject(data, ctx);
    },

    leaveProject: async (_, args, ctx) => {
      if (!ctx.auth.userId) throw AppError.unauthorized("Unauthorized");
      const data = LeaveProjectSchema.parse({
        projectId: args.projectId,
        actorUserId: ctx.auth.userId,
      });
      return leaveProject(data, ctx);
    },
  },
};
