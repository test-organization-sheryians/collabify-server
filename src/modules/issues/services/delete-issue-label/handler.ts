/**
 * deleteIssueLabel — Service Handler (thin orchestrator)
 *
 * Steps:
 *   1. fetchLabel           — load label lean
 *   2. verifyProjectMember  — auth gate
 *   3. softDeleteLabel      — set deletedAt = now()
 */
import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { ServiceContext } from "@/graphql/types";
import type { DeleteIssueLabelInput } from "./schema";
import type { DeleteIssueLabelResult } from "./types";
import { fetchLabel } from "./steps/fetch-label";
import { verifyProjectMember } from "./steps/verify-project-member";
import { softDeleteLabel } from "./steps/soft-delete-label";

const logger = createLogger("issues:services:delete-issue-label");

export const deleteIssueLabelHandler = async (
  input: DeleteIssueLabelInput,
  ctx: ServiceContext
): Promise<DeleteIssueLabelResult> => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated.");

  logger.debug("deleteIssueLabel started", { userId, labelId: input.labelId });

  const existing = await fetchLabel(input.labelId, ctx.db);
  await verifyProjectMember(existing.projectId, userId, ctx.db);
  await softDeleteLabel(input.labelId, ctx.db);

  logger.info("deleteIssueLabel done", { labelId: input.labelId });
  return { success: true, id: input.labelId };
};
