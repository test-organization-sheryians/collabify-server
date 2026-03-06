/**
 * updateProject — Service Handler (thin orchestrator)
 *
 * Steps:
 *   1. verifyActorIsProjectManager — FORBIDDEN if actor cannot manage this project
 *   2. updateProjectFields         — update name/description/isPrivate; return project
 */
import type { UpdateProjectInput } from "./schema";
import type { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import { verifyActorIsProjectManager } from "./steps/verify-actor-is-project-manager";
import { updateProjectFields } from "./steps/update-project-fields";

export const updateProject = async (
  input: UpdateProjectInput,
  ctx: ServiceContext
) => {
  const { projectId, actorUserId, name, description, isPrivate } = input;
  const { db } = ctx;

  // Fetch the project's workspaceId for the guard
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { workspaceId: true },
  });
  if (!project) throw AppError.notFound("Project not found");

  await verifyActorIsProjectManager(
    projectId,
    project.workspaceId,
    actorUserId,
    db
  );
  return updateProjectFields(projectId, { name, description, isPrivate }, db);
};
