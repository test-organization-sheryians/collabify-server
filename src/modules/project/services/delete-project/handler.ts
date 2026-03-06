/**
 * deleteProject — Service Handler (thin orchestrator)
 *
 * Steps:
 *   1. fetchProjectAndVerifyManager — NOT_FOUND or FORBIDDEN guard
 *   2. softDeleteProject            — set deletedAt = now
 */
import type { DeleteProjectInput } from "./schema";
import type { ServiceContext } from "@/graphql/types";
import { fetchProjectAndVerifyManager } from "./steps/fetch-project-and-verify-manager";
import { softDeleteProject } from "./steps/soft-delete-project";

export const deleteProject = async (
  input: DeleteProjectInput,
  ctx: ServiceContext
) => {
  const { projectId, actorUserId } = input;
  const { db } = ctx;

  await fetchProjectAndVerifyManager(projectId, actorUserId, db);
  await softDeleteProject(projectId, db);
  return true;
};
