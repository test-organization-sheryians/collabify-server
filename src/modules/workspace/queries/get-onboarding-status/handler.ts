import { GetOnboardingStatusInput } from "./types";
import { getMyWorkspaces } from "../../queries/get-my-workspaces";
import { ServiceContext } from "@/graphql/types";

export const getOnboardingStatus = async (
  input: GetOnboardingStatusInput,
  ctx: ServiceContext
) => {
  const { userId } = input;
  const { db } = ctx;

  // 1. Check User Existence (Strict)
  const user = await db.user.findUnique({ where: { id: userId } });
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
      hasUser: true, // Assuming user exists at this point
      hasWorkspace: false,
      hasProject: false,
      workspaceSlug: null,
    };
  }

  const firstWorkspace = workspaces[0];
  return {
    hasUser: true,
    hasWorkspace: true,
    hasProject: false,
    workspaceSlug: firstWorkspace.slug,
  };
};
