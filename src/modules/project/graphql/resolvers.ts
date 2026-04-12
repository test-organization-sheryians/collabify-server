import { Resolvers } from "@/graphql/generated";
import { AppError } from "@/shared/errors";
import { requireUser } from "@/shared/utils/graphql-helpers";
import * as prefWriter from "@/modules/notification/shared/preferences/preference-writer";
import type { PluginType } from "@prisma/client";
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
  createProjectRole,
  CreateProjectRoleSchema,
  updateProjectRole,
  UpdateProjectRoleSchema,
  deleteProjectRole,
  DeleteProjectRoleSchema,
  toggleProjectPlugin,
  ToggleProjectPluginSchema,
  requestProjectLogoUpload,
  RequestProjectLogoUploadSchema,
  updateProjectNotifPrefs,
  UpdateProjectNotifPrefsSchema,
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
  getProjectRoles,
  GetProjectRolesSchema,
  getProjectOverview,
  GetProjectOverviewSchema,
  getAllPermissions,
  GetAllPermissionsSchema,
  getProjectPermissions,
  GetProjectPermissionsSchema,
  projectContributorStats,
  ProjectContributorStatsSchema,
} from "../queries";

export const resolvers: Resolvers = {
  Project: {
    members: (parent, _args, ctx) => {
      if (!ctx.dataloaders?.project?.membersByProjectId) {
        throw new Error("Project DataLoaders not found in context");
      }
      return ctx.dataloaders.project.membersByProjectId.load(parent.id);
    },
    // If activePlugins was already appended by the query handler (e.g. getProjectBySlug),
    // return it directly. Otherwise lazy-fetch from DB (covers DataLoader code paths).
    activePlugins: async (parent, _args, ctx) => {
      if ((parent as any).activePlugins) return (parent as any).activePlugins;
      const rows = await ctx.db.projectPlugin.findMany({
        where: { projectId: parent.id },
        select: { type: true },
      });
      return rows.map((r) => r.type as string);
    },
  },
  ProjectMember: {
    // Field resolver: converts the Prisma Date to an ISO string before it hits the wire.
    // SDL declares joinedAt as String! — this is the correct place for Date→string serialization.
    joinedAt: (parent) => (parent.joinedAt as unknown as Date).toISOString(),
    role: (parent) => (parent as any).role ?? (parent as any).projectRole?.name ?? null,
    // Map Prisma's `projectRoleId` FK to the GQL `roleId` field.
    // Falls back to projectRole.id when the relation is included (e.g. from mutation responses).
    roleId: (parent) =>
      (parent as any).projectRoleId ?? (parent as any).projectRole?.id ?? null,
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
      return getProjectMembers(data, ctx) as any;
    },

    projectRoles: async (_, args, ctx) => {
      if (!ctx.auth.userId) throw AppError.unauthorized("Unauthorized");
      const data = GetProjectRolesSchema.parse({
        projectId: args.projectId,
        workspaceId: args.workspaceId,
        actorUserId: ctx.auth.userId,
      });
      return getProjectRoles(data, ctx);
    },

    projectOverview: async (_, args, ctx) => {
      if (!ctx.auth.userId) throw AppError.unauthorized("Unauthorized");
      const data = GetProjectOverviewSchema.parse({ projectId: args.projectId });
      return getProjectOverview(data, ctx);
    },

    allPermissions: async (_, args, ctx) => {
      if (!ctx.auth.userId) throw AppError.unauthorized("Unauthorized");
      const data = GetAllPermissionsSchema.parse({ workspaceId: args.workspaceId });
      return getAllPermissions(data, ctx);
    },

    projectPermissions: async (_, args, ctx) => {
      if (!ctx.auth.userId) throw AppError.unauthorized("Unauthorized");
      const data = GetProjectPermissionsSchema.parse({
        workspaceId: args.workspaceId,
        projectId: args.projectId,
      });
      return getProjectPermissions(data, ctx);
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
        roleId: args.roleId,
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

    createProjectRole: async (_, args, ctx) => {
      if (!ctx.auth.userId) throw AppError.unauthorized("Unauthorized");
      const data = CreateProjectRoleSchema.parse({
        projectId: args.projectId,
        workspaceId: args.workspaceId,
        actorUserId: ctx.auth.userId,
        ...args.input,
      });
      return createProjectRole(data, ctx);
    },

    updateProjectRole: async (_, args, ctx) => {
      if (!ctx.auth.userId) throw AppError.unauthorized("Unauthorized");
      const data = UpdateProjectRoleSchema.parse({
        roleId: args.roleId,
        projectId: args.projectId,
        workspaceId: args.workspaceId,
        actorUserId: ctx.auth.userId,
        ...args.input,
      });
      return updateProjectRole(data, ctx);
    },

    deleteProjectRole: async (_, args, ctx) => {
      if (!ctx.auth.userId) throw AppError.unauthorized("Unauthorized");
      const data = DeleteProjectRoleSchema.parse({
        roleId: args.roleId,
        projectId: args.projectId,
        workspaceId: args.workspaceId,
        actorUserId: ctx.auth.userId,
      });
      return deleteProjectRole(data, ctx);
    },

    toggleProjectPlugin: async (_, args, ctx) => {
      if (!ctx.auth.userId) throw AppError.unauthorized('Unauthorized');
      const data = ToggleProjectPluginSchema.parse({
        projectId: args.projectId,
        workspaceId: args.workspaceId,
        type: args.type,
        enable: args.enable,
        actorUserId: ctx.auth.userId,
      });
      return toggleProjectPlugin(data, ctx);
    },

    requestProjectLogoUpload: async (_, args, ctx) => {
      if (!ctx.auth.userId) throw AppError.unauthorized('Unauthorized');
      const data = RequestProjectLogoUploadSchema.parse({
        projectId: args.projectId,
        mimeType: args.mimeType,
        sizeBytes: args.sizeBytes,
        actorUserId: ctx.auth.userId,
      });
      return requestProjectLogoUpload(data, ctx);
    },
    // @ts-expect-error - NotificationCategory from events/types vs graphql/generated are structurally identical strings
    updateProjectNotifPrefs: async (_, args, ctx) => {
      if (!ctx.auth.userId) throw AppError.unauthorized("Unauthorized");
      const data = UpdateProjectNotifPrefsSchema.parse({
        userId: ctx.auth.userId,
        projectId: args.projectId,
        ...args.input,
      });
      return updateProjectNotifPrefs(data, ctx);
    },
    muteProject: async (_root, args, ctx) => {
      if (!ctx.auth.userId) throw AppError.unauthorized("Unauthorized");
      await prefWriter.updateProject(ctx.auth.userId, args.projectId, {
        muteUntil: args.until ? new Date(args.until) : null,
      });
      return true;
    },
    unmuteProject: async (_root, args, ctx) => {
      if (!ctx.auth.userId) throw AppError.unauthorized("Unauthorized");
      await prefWriter.updateProject(ctx.auth.userId, args.projectId, {
        muteUntil: null,
      });
      return true;
    },
  },
};
