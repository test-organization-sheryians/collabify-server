import { GetMyProjectsTypeDefs } from "./get-my-projects";
import { GetProjectBySlugTypeDefs } from "./get-project-by-slug";
import { GetProjectByIdTypeDefs } from "./get-project-by-id";

export const typeDefs = [
  GetMyProjectsTypeDefs,
  GetProjectBySlugTypeDefs,
  GetProjectByIdTypeDefs,
].join("\n");

export * from "./get-my-projects";
export * from "./get-project-by-slug";
export * from "./get-project-by-id";
