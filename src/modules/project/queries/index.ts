import { GetMyProjectsTypeDefs } from "./get-my-projects";
import { GetProjectBySlugTypeDefs } from "./get-project-by-slug";
import { GetProjectByIdTypeDefs } from "./get-project-by-id";
import { getProjectMembersTypeDefs } from "./get-project-members";

export const typeDefs = [
  GetMyProjectsTypeDefs,
  GetProjectBySlugTypeDefs,
  GetProjectByIdTypeDefs,
  getProjectMembersTypeDefs,
].join("\n");

export * from "./get-my-projects";
export * from "./get-project-by-slug";
export * from "./get-project-by-id";
export * from "./get-project-members";
