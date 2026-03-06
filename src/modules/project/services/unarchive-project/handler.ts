/**
 * unarchiveProject — Service Handler (thin orchestrator)
 *
 * Steps:
 *   1. fetchProjectAndVerifyManager — NOT_FOUND or FORBIDDEN guard
 *   2. setUnarchived               — set isArchived=false; return project
 */
import type { UnarchiveProjectInput } from "./schema";
import type { ServiceContext } from "@/graphql/types";
import { fetchProjectAndVerifyManager } from "./steps/fetch-project-and-verify-manager";
import { setUnarchived } from "./steps/set-unarchived";

export const unarchiveProject = async (
  input: UnarchiveProjectInput,
  ctx: ServiceContext
) => {
  const { projectId, actorUserId } = input;
  const { db } = ctx;

  await fetchProjectAndVerifyManager(projectId, actorUserId, db);
  return setUnarchived(projectId, db);
};
