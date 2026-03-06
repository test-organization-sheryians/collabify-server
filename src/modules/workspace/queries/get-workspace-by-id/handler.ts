/**
 * getWorkspaceById — Query Handler (thin orchestrator)
 *
 * Steps:
 *   1. verifyWorkspaceMembership — FORBIDDEN if actor not a member
 *   2. fetchWorkspaceById        — NOT_FOUND if workspace missing or deleted
 */
import type { GetWorkspaceByIdInput } from "./schema";
import type { ServiceContext } from "@/graphql/types";
import { verifyWorkspaceMembership } from "./steps/verify-workspace-membership";
import { fetchWorkspaceById } from "./steps/fetch-workspace-by-id";

export const getWorkspaceById = async (
  input: GetWorkspaceByIdInput,
  ctx: ServiceContext
) => {
  const { workspaceId, actorUserId } = input;
  const { db } = ctx;

  await verifyWorkspaceMembership(workspaceId, actorUserId, db);
  return fetchWorkspaceById(workspaceId, db);
};
