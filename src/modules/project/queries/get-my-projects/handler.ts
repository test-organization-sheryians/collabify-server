import { db } from "@/infra/db";
import { ServiceContext } from "@/graphql/types";
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

  // 1. Check Workspace Membership
  const workspaceMember = await db.workspaceMember.findFirst({
    where: {
      userId: userId,
      workspaceId: workspaceId,
    },
  });

  if (!workspaceMember) {
    throw AppError.forbidden("User is not a member of this workspace");
  }

  const projects = await db.project.findMany({
    where: {
      workspaceId: workspaceId,
    },
    orderBy: { createdAt: "desc" },
  });

  return projects;
};
