import { GetMyProjectsTypeDefs } from "./get-my-projects";
import { GetProjectBySlugTypeDefs } from "./get-project-by-slug";
import { GetProjectByIdTypeDefs } from "./get-project-by-id";
import { getProjectMembersTypeDefs } from "./get-project-members";
import { getProjectRolesTypeDefs } from "./get-project-roles";
import { getProjectOverviewTypeDefs } from "./get-project-overview";
import { getAllPermissionsTypeDefs } from "./get-all-permissions";

export const typeDefs = [
  GetMyProjectsTypeDefs,
  GetProjectBySlugTypeDefs,
  GetProjectByIdTypeDefs,
  getProjectMembersTypeDefs,
  getProjectRolesTypeDefs,
  getProjectOverviewTypeDefs,
  getAllPermissionsTypeDefs,
].join("\n");

export * from "./get-my-projects";
export * from "./get-project-by-slug";
export * from "./get-project-by-id";
export * from "./get-project-members";
export * from "./get-project-roles";
export * from "./get-project-overview";
export * from "./get-all-permissions";
