/**
 * getOnboardingStatus — Query Handler (thin orchestrator)
 *
 * Steps (inline, logic is simple branching so steps/ not warranted):
 *   1. fetch user — if not found, return all-false status
 *   2. getMyWorkspaces — if no workspaces, return partial status
 *   3. return complete status with workspaceSlug
 */
import type { GetOnboardingStatusInput } from "./types";
import type { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import { getMyWorkspaces } from "../../queries/get-my-workspaces";

export const getOnboardingStatus = async (
  input: GetOnboardingStatusInput,
  ctx: ServiceContext
) => {
  if (!ctx.auth.userId) throw AppError.unauthorized();
  const { userId } = input;
  const { db } = ctx;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!user) {
    return {
      hasUser: false,
      hasWorkspace: false,
      hasProject: false,
      workspaceSlug: null,
    };
  }

  const workspaces = await getMyWorkspaces({ userId }, ctx);
  if (workspaces.length === 0) {
    return {
      hasUser: true,
      hasWorkspace: false,
      hasProject: false,
      workspaceSlug: null,
    };
  }

  return {
    hasUser: true,
    hasWorkspace: true,
    hasProject: false,
    workspaceSlug: workspaces[0].slug,
  };
};
