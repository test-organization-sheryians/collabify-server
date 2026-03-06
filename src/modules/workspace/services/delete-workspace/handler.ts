/**
 * deleteWorkspace — Service Handler (thin orchestrator)
 *
 * Steps:
 *   1. verifyActorIsOwner   — FORBIDDEN if actor is not OWNER
 *   2. softDeleteWorkspace  — set deletedAt = now
 */
import type { DeleteWorkspaceInput } from "./schema";
import type { ServiceContext } from "@/graphql/types";
import { verifyActorIsOwner } from "./steps/verify-actor-is-owner";
import { softDeleteWorkspace } from "./steps/soft-delete-workspace";

export const deleteWorkspace = async (
  input: DeleteWorkspaceInput,
  ctx: ServiceContext
) => {
  const { workspaceId, actorUserId } = input;
  const { db } = ctx;

  await verifyActorIsOwner(workspaceId, actorUserId, db);
  await softDeleteWorkspace(workspaceId, db);
  return true;
};
