import { db } from "@/infra/db";
import { ServiceContext } from "@/graphql/types"; // Keeping strict dependency on ServiceContext for DataLoaders?
// Ideally specific modules should not depend on global GQL types if possible, but for Dataloaders it's convenient.
// Plan said "handler.ts: Logic from logic/retrieval.ts"
import { AppError } from "@/shared/errors";
import { Project } from "@prisma/client";
import { GetMyProjectsInput } from "./types";

export const getMyProjects = async (
  ctx: ServiceContext,
  input: GetMyProjectsInput
): Promise<Project[]> => {
  const { workspaceId, userId } = input;

  if (!ctx.auth.userId) {
    throw AppError.unauthorized("User not authenticated");
  }

  // 1. Get Member Records
  const members = await db.projectMember.findMany({
    where: {
      userId: userId,
      workspaceId: workspaceId,
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
  // We assume loaders are available on ctx.dataloaders.project
  if (!ctx.dataloaders.project?.projectById) {
    throw new Error("Project DataLoaders not initialized");
  }

  const results =
    await ctx.dataloaders.project.projectById.loadMany(projectIds);

  const projects: Project[] = [];
  for (const result of results) {
    if (result && !(result instanceof Error)) {
      projects.push(result);
    }
  }

  return projects;
};
