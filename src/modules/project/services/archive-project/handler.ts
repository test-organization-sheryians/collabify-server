/**
 * archiveProject — Service Handler (thin orchestrator)
 *
 * Steps:
 *   1. fetchProjectAndVerifyManager — NOT_FOUND or FORBIDDEN guard
 *   2. setArchived                  — set isArchived=true; return project
 */
import type { ArchiveProjectInput } from "./schema";
import type { ServiceContext } from "@/graphql/types";
import { fetchProjectAndVerifyManager } from "./steps/fetch-project-and-verify-manager";
import { setArchived } from "./steps/set-archived";

export const archiveProject = async (
  input: ArchiveProjectInput,
  ctx: ServiceContext
) => {
  const { projectId, actorUserId } = input;
  const { db } = ctx;

  await fetchProjectAndVerifyManager(projectId, actorUserId, db);
  return setArchived(projectId, db);
};
