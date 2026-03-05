/**
 * Check if the user already has a workspace (idempotency guard).
 * If they do, return the first workspace to short-circuit creation.
 * Returns null if the user has no workspaces (creation should proceed).
 */
import { getMyWorkspaces } from "../../../queries/get-my-workspaces";
import { createLogger } from "@/shared/lib/logger";
import type { ServiceContext } from "@/graphql/types";

const logger = createLogger("workspace:services:create-onboarding-workspace");

export async function checkIdempotency(userId: string, ctx: ServiceContext) {
  const existing = await getMyWorkspaces({ userId }, ctx);

  if (existing.length > 0) {
    logger.info("Onboarding Idempotency: Workspace already exists", {
      userId,
      workspaceId: existing[0].id,
    });
    return existing[0];
  }

  return null;
}
