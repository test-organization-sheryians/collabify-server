import { ServiceContext } from "@/graphql/types";
import { Project } from "@prisma/client";
import { GetProjectByIdInput } from "./types";

export const getProjectById = async (
  ctx: ServiceContext,
  input: GetProjectByIdInput
): Promise<Project | null> => {
  const { id } = input;

  if (!ctx.dataloaders.project?.projectById) {
    throw new Error("Project DataLoaders not initialized");
  }

  return ctx.dataloaders.project.projectById.load(id);
};
