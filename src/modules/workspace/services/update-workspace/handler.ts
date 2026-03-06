/**
 * updateWorkspace — Service Handler (thin orchestrator)
 *
 * Steps:
 *   1. verifyActorIsAtLeastAdmin — FORBIDDEN if actor rank < 80 (ADMIN)
 *   2. updateWorkspaceFields     — update name/logoUrl/domainWhitelist; return workspace
 */
import type { UpdateWorkspaceInput } from "./schema";
import type { ServiceContext } from "@/graphql/types";
import { verifyActorIsAtLeastAdmin } from "./steps/verify-actor-is-at-least-admin";
import { updateWorkspaceFields } from "./steps/update-workspace-fields";

export const updateWorkspace = async (
  input: UpdateWorkspaceInput,
  ctx: ServiceContext
) => {
  const { workspaceId, actorUserId, name, logoUrl, domainWhitelist } = input;
  const { db } = ctx;

  await verifyActorIsAtLeastAdmin(workspaceId, actorUserId, db);
  return updateWorkspaceFields(
    workspaceId,
    { name, logoUrl, domainWhitelist },
    db
  );
};
