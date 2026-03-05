/**
 * getWorkspaceMembers — Query Handler (thin orchestrator)
 *
 * Steps:
 *   1. verifyWorkspaceMembership — assert actor is a member; throw FORBIDDEN if not
 *   2. fetchMembers              — load all members with user profiles, ordered by joinedAt
 */
import type { GetWorkspaceMembersInput } from "./types";
import type { ServiceContext } from "@/graphql/types";
import { verifyWorkspaceMembership } from "./steps/verify-workspace-membership";
import { fetchMembers } from "./steps/fetch-members";

export const getWorkspaceMembers = async (
  input: GetWorkspaceMembersInput,
  ctx: ServiceContext
) => {
  const { workspaceId, actorUserId } = input;
  const { db } = ctx;

  await verifyWorkspaceMembership(workspaceId, actorUserId, db);
  return fetchMembers(workspaceId, db);
};
