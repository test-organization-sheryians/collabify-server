/**
 * getProjectById — Query Handler
 *
 * Single DataLoader call — no steps/ needed.
 * Signature fixed to (input, ctx) to match module-wide convention.
 */
import type { ServiceContext } from "@/graphql/types";
import type { GetProjectByIdInput } from "./types";

export const getProjectById = async (
  input: GetProjectByIdInput,
  ctx: ServiceContext
) => {
  const { id } = input;

  if (!ctx.dataloaders.project?.projectById) {
    throw new Error("Project DataLoaders not initialized");
  }

  return ctx.dataloaders.project.projectById.load(id);
};
