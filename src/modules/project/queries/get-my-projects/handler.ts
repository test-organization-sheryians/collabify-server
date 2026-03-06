/**
 * getMyProjects — Query Handler (thin orchestrator)
 *
 * Steps:
 *   1. verifyWorkspaceMember — assert caller is workspace member; throw FORBIDDEN if not
 *   2. fetchProjects         — load all workspace projects ordered by createdAt desc
 */
import type { ServiceContext } from "@/graphql/types";
import type { GetMyProjectsInput } from "./types";
import { verifyWorkspaceMember } from "./steps/verify-workspace-member";
import { fetchProjects } from "./steps/fetch-projects";

export const getMyProjects = async (
  input: GetMyProjectsInput,
  ctx: ServiceContext
) => {
  const { workspaceId, userId } = input;
  const { db } = ctx;

  await verifyWorkspaceMember(workspaceId, userId, db);
  return fetchProjects(workspaceId, db);
};
