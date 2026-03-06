/**
 * getProjectMembers — Query Handler (thin orchestrator)
 *
 * Steps:
 *   1. verifyProjectAccess  — FORBIDDEN if actor is not a project member or workspace ADMIN+
 *   2. fetchProjectMembers  — load all project members with user profiles
 */
import type { GetProjectMembersInput } from "./schema";
import type { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import { verifyProjectAccess } from "./steps/verify-project-access";
import { fetchProjectMembers } from "./steps/fetch-project-members";

export const getProjectMembers = async (
  input: GetProjectMembersInput,
  ctx: ServiceContext
) => {
  const { projectId, actorUserId } = input;
  const { db } = ctx;

  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { workspaceId: true },
  });
  if (!project) throw AppError.notFound("Project not found");

  await verifyProjectAccess(projectId, project.workspaceId, actorUserId, db);
  return fetchProjectMembers(projectId, db);
};
